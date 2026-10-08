import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ActivityEventType,
  ApprovalStatus,
  ExecutionStepStatus,
  OutboxEventStatus,
  OutboxEventType,
  MembershipStatus,
  OrganizationStatus,
  PolicyMode,
  PolicyEvaluationResult,
  Prisma,
  WorkflowActionType,
  WorkflowExecutionStatus,
  WorkflowStatus,
  WorkspaceStatus,
  type OutboxEvent,
} from "@prisma/client";
import { ActivityEventService } from "../activity/activity.service.js";
import { PrismaService } from "../database/prisma.service.js";
import { outboxRetryDelayMs } from "../outbox/outbox.service.js";
import { OUTBOX_LEASE_MS } from "../outbox/outbox.service.js";
import {
  tenantOwnedWhere,
  type VerifiedTenantScope,
} from "../tenancy/tenant-scope.js";
import type {
  ChangePolicyDto,
  CreateWorkflowDto,
  DecideApprovalDto,
  UpdateWorkflowDefinitionDto,
} from "./workflow-control.dto.js";
import {
  canDecideApproval,
  canTransitionWorkflow,
  evaluateWorkflowRule,
} from "./workflow-state.js";

function unavailable(): never {
  throw new NotFoundException({
    code: "RESOURCE_NOT_FOUND",
    message: "Resource not found.",
  });
}

function invalidTransition(): never {
  throw new ConflictException({
    code: "INVALID_STATE_TRANSITION",
    message: "This state change is not available.",
  });
}

const tenant = (scope: VerifiedTenantScope) => ({
  organizationId: scope.organizationId,
  workspaceId: scope.workspaceId,
});

@Injectable()
export class WorkflowControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityEventService,
  ) {}

  private async lockWorkflow(
    database: Prisma.TransactionClient,
    scope: VerifiedTenantScope,
    workflowId: string,
  ) {
    const locked = await database.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "workflows"
      WHERE "id" = ${workflowId}::uuid
        AND "organization_id" = ${scope.organizationId}::uuid
        AND "workspace_id" = ${scope.workspaceId}::uuid
      FOR UPDATE
    `);
    if (locked.length !== 1) unavailable();
  }

  listWorkflows(scope: VerifiedTenantScope) {
    return this.prisma.workflow.findMany({
      where: tenant(scope),
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        triggerType: true,
        actionType: true,
        currentVersion: true,
        createdAt: true,
        updatedAt: true,
        policy: { select: { id: true, mode: true, version: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async summary(scope: VerifiedTenantScope) {
    const where = tenant(scope);
    const [workflows, running, failed] = await this.prisma.$transaction([
      this.prisma.workflow.count({ where }),
      this.prisma.workflowExecution.count({
        where: { ...where, status: WorkflowExecutionStatus.RUNNING },
      }),
      this.prisma.workflowExecution.count({
        where: { ...where, status: WorkflowExecutionStatus.FAILED },
      }),
    ]);
    return { workflows, running, failed };
  }

  async listVersions(scope: VerifiedTenantScope, workflowId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: tenantOwnedWhere(scope, workflowId),
      select: { id: true },
    });
    if (!workflow) unavailable();
    return this.prisma.workflowDefinitionVersion.findMany({
      where: { ...tenant(scope), workflowId },
      select: {
        id: true,
        version: true,
        name: true,
        description: true,
        triggerType: true,
        actionType: true,
        policyMode: true,
        policyVersion: true,
        createdAt: true,
      },
      orderBy: { version: "desc" },
    });
  }

  async getWorkflow(scope: VerifiedTenantScope, id: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: tenantOwnedWhere(scope, id),
      include: { policy: true },
    });
    if (!workflow) unavailable();
    return workflow;
  }

  async createWorkflow(scope: VerifiedTenantScope, input: CreateWorkflowDto) {
    return this.prisma.$transaction(async (database) => {
      const workflow = await database.workflow.create({
        data: {
          ...tenant(scope),
          name: input.name,
          description: input.description ?? "",
          actionType: input.actionType ?? WorkflowActionType.DRY_RUN_LOG,
          policy: { create: {} },
          versions: {
            create: {
              version: 1,
              name: input.name,
              description: input.description ?? "",
              triggerType: "MANUAL",
              actionType: input.actionType ?? WorkflowActionType.DRY_RUN_LOG,
              policyMode: PolicyMode.REQUIRE_APPROVAL,
              policyVersion: 1,
            },
          },
        },
        include: { policy: true },
      });
      await this.activity.recordUser(
        scope,
        {
          eventType: ActivityEventType.WORKFLOW_CREATED,
          action: "workflow.created",
          summary: "A controlled workflow definition was created.",
          workflowId: workflow.id,
          resourceType: "WORKFLOW",
          resourceId: workflow.id,
        },
        database,
      );
      return workflow;
    });
  }

  async changeDefinition(
    scope: VerifiedTenantScope,
    id: string,
    input: UpdateWorkflowDefinitionDto,
  ) {
    return this.prisma.$transaction(async (database) => {
      await this.lockWorkflow(database, scope, id);
      const current = await database.workflow.findFirst({
        where: tenantOwnedWhere(scope, id),
        include: { policy: true },
      });
      if (!current?.policy) unavailable();
      if (
        current.status !== WorkflowStatus.DRAFT &&
        current.status !== WorkflowStatus.PAUSED
      )
        invalidTransition();
      const name = input.name ?? current.name;
      const description = input.description ?? current.description;
      const actionType = input.actionType ?? current.actionType;
      if (
        name === current.name &&
        description === current.description &&
        actionType === current.actionType
      )
        invalidTransition();
      if (
        actionType === WorkflowActionType.INTERNAL_NOTIFICATION &&
        current.policy.mode === PolicyMode.ALLOW_DRY_RUN
      )
        invalidTransition();
      const nextVersion = current.currentVersion + 1;
      const changed = await database.workflow.updateMany({
        where: {
          ...tenantOwnedWhere(scope, id),
          status: current.status,
          currentVersion: current.currentVersion,
        },
        data: {
          name,
          description,
          actionType,
          currentVersion: nextVersion,
        },
      });
      if (changed.count !== 1) invalidTransition();
      await database.workflowDefinitionVersion.create({
        data: {
          ...tenant(scope),
          workflowId: id,
          version: nextVersion,
          name,
          description,
          triggerType: current.triggerType,
          actionType,
          policyMode: current.policy.mode,
          policyVersion: current.policy.version,
        },
      });
      await this.activity.recordUser(
        scope,
        {
          eventType: ActivityEventType.WORKFLOW_DEFINITION_CHANGED,
          action: "workflow.definition_changed",
          summary: "A new immutable workflow definition version was created.",
          workflowId: id,
          resourceType: "WORKFLOW",
          resourceId: id,
          metadata: { definitionVersion: nextVersion },
        },
        database,
      );
      return database.workflow.findFirstOrThrow({
        where: tenantOwnedWhere(scope, id),
        include: { policy: true },
      });
    });
  }

  async changeStatus(
    scope: VerifiedTenantScope,
    id: string,
    next: WorkflowStatus,
  ) {
    return this.prisma.$transaction(async (database) => {
      const current = await database.workflow.findFirst({
        where: tenantOwnedWhere(scope, id),
      });
      if (!current) unavailable();
      if (!canTransitionWorkflow(current.status, next)) invalidTransition();
      const changed = await database.workflow.updateMany({
        where: { ...tenantOwnedWhere(scope, id), status: current.status },
        data: { status: next },
      });
      if (changed.count !== 1) invalidTransition();
      await this.activity.recordUser(
        scope,
        {
          eventType: ActivityEventType.WORKFLOW_STATUS_CHANGED,
          action: "workflow.status_changed",
          summary: `Workflow status changed to ${next}.`,
          workflowId: id,
          resourceType: "WORKFLOW",
          resourceId: id,
          metadata: { from: current.status, to: next },
        },
        database,
      );
      return database.workflow.findFirstOrThrow({
        where: tenantOwnedWhere(scope, id),
      });
    });
  }

  async changePolicy(
    scope: VerifiedTenantScope,
    workflowId: string,
    input: ChangePolicyDto,
  ) {
    return this.prisma.$transaction(async (database) => {
      await this.lockWorkflow(database, scope, workflowId);
      const workflow = await database.workflow.findFirst({
        where: tenantOwnedWhere(scope, workflowId),
        include: { policy: true },
      });
      if (!workflow?.policy) unavailable();
      if (workflow.status === WorkflowStatus.ARCHIVED) invalidTransition();
      if (
        workflow.actionType === WorkflowActionType.INTERNAL_NOTIFICATION &&
        input.mode === PolicyMode.ALLOW_DRY_RUN
      )
        invalidTransition();
      const versionChanged = await database.workflow.updateMany({
        where: {
          ...tenantOwnedWhere(scope, workflowId),
          currentVersion: workflow.currentVersion,
        },
        data: { currentVersion: { increment: 1 } },
      });
      if (versionChanged.count !== 1) invalidTransition();
      const changed = await database.policy.updateMany({
        where: {
          ...tenantOwnedWhere(scope, workflow.policy.id),
          version: workflow.policy.version,
        },
        data: { mode: input.mode, version: { increment: 1 } },
      });
      if (changed.count !== 1) invalidTransition();
      await database.workflowDefinitionVersion.create({
        data: {
          ...tenant(scope),
          workflowId,
          version: workflow.currentVersion + 1,
          name: workflow.name,
          description: workflow.description,
          triggerType: workflow.triggerType,
          actionType: workflow.actionType,
          policyMode: input.mode,
          policyVersion: workflow.policy.version + 1,
        },
      });
      await this.activity.recordUser(
        scope,
        {
          eventType: ActivityEventType.POLICY_CHANGED,
          action: "policy.changed",
          summary: "Workflow policy mode changed.",
          workflowId,
          resourceType: "POLICY",
          resourceId: workflow.policy.id,
          metadata: { from: workflow.policy.mode, to: input.mode },
        },
        database,
      );
      return database.policy.findFirstOrThrow({
        where: tenantOwnedWhere(scope, workflow.policy.id),
      });
    });
  }

  async requestExecution(
    scope: VerifiedTenantScope,
    workflowId: string,
    idempotencyKey: string,
  ) {
    const existing = await this.prisma.workflowExecution.findFirst({
      where: { ...tenant(scope), idempotencyKey },
    });
    if (existing) {
      if (existing.workflowId !== workflowId) invalidTransition();
      return existing;
    }
    try {
      return await this.prisma.$transaction(async (database) => {
        // Serialize definition/policy edits with the version selected for this run.
        await this.lockWorkflow(database, scope, workflowId);
        const workflow = await database.workflow.findFirst({
          where: tenantOwnedWhere(scope, workflowId),
          include: { policy: true },
        });
        if (!workflow?.policy) unavailable();
        if (workflow.status !== WorkflowStatus.ACTIVE) invalidTransition();
        const definition = await database.workflowDefinitionVersion.findFirst({
          where: {
            ...tenant(scope),
            workflowId,
            version: workflow.currentVersion,
          },
        });
        if (!definition) invalidTransition();
        if (
          definition.actionType !== workflow.actionType ||
          definition.policyMode !== workflow.policy.mode ||
          definition.policyVersion !== workflow.policy.version
        )
          invalidTransition();
        if (
          definition.actionType === WorkflowActionType.INTERNAL_NOTIFICATION &&
          definition.policyMode === PolicyMode.ALLOW_DRY_RUN
        )
          invalidTransition();
        const result = evaluateWorkflowRule({
          actionType: definition.actionType,
          mode: definition.policyMode,
        });
        const status =
          result === PolicyEvaluationResult.ALLOWED
            ? WorkflowExecutionStatus.QUEUED
            : result === PolicyEvaluationResult.APPROVAL_REQUIRED
              ? WorkflowExecutionStatus.WAITING_FOR_APPROVAL
              : WorkflowExecutionStatus.CANCELLED;
        const execution = await database.workflowExecution.create({
          data: {
            ...tenant(scope),
            workflowId,
            definitionVersionId: definition.id,
            initiatedByMembershipId: scope.membershipId,
            idempotencyKey,
            status,
            ...(status === WorkflowExecutionStatus.CANCELLED
              ? { completedAt: new Date() }
              : {}),
          },
        });
        await database.policyEvaluation.create({
          data: {
            ...tenant(scope),
            policyId: workflow.policy.id,
            executionId: execution.id,
            policyVersion: definition.policyVersion,
            result,
          },
        });
        await database.executionStep.create({
          data: {
            ...tenant(scope),
            executionId: execution.id,
            stepNumber: 1,
            actionType: definition.actionType,
          },
        });
        if (result === PolicyEvaluationResult.APPROVAL_REQUIRED) {
          await database.approvalRequest.create({
            data: {
              ...tenant(scope),
              workflowId,
              workflowExecutionId: execution.id,
              reason:
                definition.actionType ===
                WorkflowActionType.INTERNAL_NOTIFICATION
                  ? "Policy requires review before an internal notification is created."
                  : "Policy requires human review before this dry run.",
              expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
            },
          });
        } else if (result === PolicyEvaluationResult.ALLOWED) {
          await this.enqueueAction(database, execution, definition.actionType);
        }
        await this.activity.recordUser(
          scope,
          {
            eventType: ActivityEventType.POLICY_EVALUATED,
            action: "policy.evaluated",
            summary: `Workflow policy evaluation: ${result}.`,
            workflowId,
            resourceType: "WORKFLOW_EXECUTION",
            resourceId: execution.id,
            metadata: {
              result,
              policyVersion: definition.policyVersion,
              definitionVersion: definition.version,
            },
          },
          database,
        );
        await this.activity.recordUser(
          scope,
          {
            eventType: ActivityEventType.WORKFLOW_EXECUTION_CHANGED,
            action: "workflow.execution_requested",
            summary: `Workflow execution entered ${status}.`,
            workflowId,
            resourceType: "WORKFLOW_EXECUTION",
            resourceId: execution.id,
            metadata: { status },
          },
          database,
        );
        return execution;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const concurrent = await this.prisma.workflowExecution.findFirst({
          where: { ...tenant(scope), idempotencyKey },
        });
        if (concurrent?.workflowId === workflowId) return concurrent;
        invalidTransition();
      }
      throw error;
    }
  }

  listExecutions(scope: VerifiedTenantScope, workflowId: string) {
    return this.prisma.workflowExecution.findMany({
      where: { ...tenant(scope), workflowId },
      include: {
        evaluation: { select: { result: true, policyVersion: true } },
        definitionVersion: {
          select: {
            version: true,
            name: true,
            actionType: true,
            policyMode: true,
          },
        },
        approval: { select: { id: true, status: true } },
        steps: {
          select: {
            stepNumber: true,
            actionType: true,
            status: true,
            startedAt: true,
            completedAt: true,
          },
        },
        outboxEvents: {
          select: {
            status: true,
            attempts: true,
            maxAttempts: true,
            nextAttemptAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  listApprovals(scope: VerifiedTenantScope) {
    return this.prisma.approvalRequest.findMany({
      where: { ...tenant(scope), workflowExecutionId: { not: null } },
      include: {
        decision: { select: { decision: true, decidedAt: true, note: true } },
        workflow: { select: { name: true, actionType: true } },
        workflowExecution: {
          select: {
            id: true,
            status: true,
            definitionVersion: {
              select: {
                version: true,
                name: true,
                actionType: true,
                policyMode: true,
              },
            },
            evaluation: {
              select: { result: true, policyVersion: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async approvalSummary(scope: VerifiedTenantScope) {
    return {
      pending: await this.prisma.approvalRequest.count({
        where: {
          ...tenant(scope),
          workflowExecutionId: { not: null },
          status: ApprovalStatus.PENDING,
          expiresAt: { gt: new Date() },
        },
      }),
    };
  }

  /** Reconcile only expired local leases; never replay a completed step. */
  async recoverStaleExecutions(now = new Date()): Promise<number> {
    const staleBefore = new Date(now.getTime() - OUTBOX_LEASE_MS);
    const candidates = await this.prisma.workflowExecution.findMany({
      where: {
        status: WorkflowExecutionStatus.RUNNING,
        startedAt: { lt: staleBefore },
      },
      select: { id: true, organizationId: true, workspaceId: true },
      orderBy: { startedAt: "asc" },
      take: 50,
    });
    let recovered = 0;
    for (const candidate of candidates) {
      const scope = {
        organizationId: candidate.organizationId,
        workspaceId: candidate.workspaceId,
      };
      const changed = await this.prisma.$transaction(async (database) => {
        const execution = await database.workflowExecution.findFirst({
          where: {
            ...candidate,
            status: WorkflowExecutionStatus.RUNNING,
            startedAt: { lt: staleBefore },
          },
        });
        if (!execution) return false;
        const event = await database.outboxEvent.findFirst({
          where: {
            ...scope,
            workflowExecutionId: execution.id,
            eventType: {
              in: [
                OutboxEventType.WORKFLOW_DRY_RUN,
                OutboxEventType.WORKFLOW_INTERNAL_NOTIFICATION,
              ],
            },
          },
        });
        const step = await database.executionStep.findFirst({
          where: { ...scope, executionId: execution.id, stepNumber: 1 },
        });
        if (
          event?.status === OutboxEventStatus.PROCESSING &&
          (!event.lockedAt || event.lockedAt >= staleBefore)
        )
          return false;
        const notificationExists =
          step?.actionType === WorkflowActionType.INTERNAL_NOTIFICATION
            ? Boolean(
                await database.notification.findFirst({
                  where: { ...scope, workflowExecutionId: execution.id },
                  select: { id: true },
                }),
              )
            : true;
        const completedStep =
          step?.status === ExecutionStepStatus.SUCCEEDED && notificationExists;
        const canRetry =
          event &&
          (event.status === OutboxEventStatus.PENDING ||
            event.status === OutboxEventStatus.PROCESSING) &&
          step &&
          step.status !== ExecutionStepStatus.SUCCEEDED;
        const next = completedStep
          ? WorkflowExecutionStatus.SUCCEEDED
          : canRetry
            ? WorkflowExecutionStatus.QUEUED
            : WorkflowExecutionStatus.FAILED;
        const updated = await database.workflowExecution.updateMany({
          where: {
            ...candidate,
            status: WorkflowExecutionStatus.RUNNING,
            startedAt: { lt: staleBefore },
          },
          data: {
            status: next,
            ...(next === WorkflowExecutionStatus.QUEUED
              ? { startedAt: null }
              : { completedAt: now }),
          },
        });
        if (updated.count !== 1) return false;
        if (
          completedStep &&
          event &&
          event.status !== OutboxEventStatus.COMPLETED
        ) {
          const reconciled = await database.outboxEvent.updateMany({
            where: {
              id: event.id,
              ...scope,
              status: event.status,
              lockToken: event.lockToken,
            },
            data: {
              status: OutboxEventStatus.COMPLETED,
              completedAt: now,
              lockToken: null,
              lockedAt: null,
            },
          });
          if (reconciled.count !== 1) invalidTransition();
        }
        if (canRetry && step?.status === ExecutionStepStatus.RUNNING) {
          await database.executionStep.updateMany({
            where: {
              id: step.id,
              ...scope,
              status: ExecutionStepStatus.RUNNING,
            },
            data: { status: ExecutionStepStatus.PENDING, startedAt: null },
          });
        }
        if (next === WorkflowExecutionStatus.FAILED && step) {
          await database.executionStep.updateMany({
            where: {
              id: step.id,
              ...scope,
              status: { not: ExecutionStepStatus.SUCCEEDED },
            },
            data: { status: ExecutionStepStatus.FAILED, completedAt: now },
          });
        }
        await this.activity.recordSystem(
          execution,
          {
            eventType: ActivityEventType.WORKFLOW_EXECUTION_CHANGED,
            action: "workflow.execution_recovered",
            summary: `Stale execution reconciled as ${next}.`,
            workflowId: execution.workflowId,
            resourceType: "WORKFLOW_EXECUTION",
            resourceId: execution.id,
            metadata: { status: next },
          },
          database,
        );
        return true;
      });
      if (changed) recovered += 1;
    }
    return recovered;
  }

  /** The worker sweeps only persisted, expired pending requests. CAS makes concurrent sweeps safe. */
  async expireApprovals(now = new Date()): Promise<number> {
    const candidates = await this.prisma.approvalRequest.findMany({
      where: {
        status: ApprovalStatus.PENDING,
        expiresAt: { lte: now },
        workflowExecutionId: { not: null },
      },
      select: {
        id: true,
        organizationId: true,
        workspaceId: true,
        workflowId: true,
        workflowExecutionId: true,
      },
      orderBy: { expiresAt: "asc" },
      take: 50,
    });
    let expired = 0;
    for (const candidate of candidates) {
      const executionId = candidate.workflowExecutionId;
      if (!executionId) continue;
      const changed = await this.prisma.$transaction(async (database) => {
        const request = await database.approvalRequest.updateMany({
          where: {
            id: candidate.id,
            organizationId: candidate.organizationId,
            workspaceId: candidate.workspaceId,
            status: ApprovalStatus.PENDING,
            expiresAt: { lte: now },
          },
          data: { status: ApprovalStatus.EXPIRED },
        });
        if (request.count !== 1) return false;
        const execution = await database.workflowExecution.updateMany({
          where: {
            id: executionId,
            organizationId: candidate.organizationId,
            workspaceId: candidate.workspaceId,
            status: WorkflowExecutionStatus.WAITING_FOR_APPROVAL,
          },
          data: {
            status: WorkflowExecutionStatus.CANCELLED,
            completedAt: now,
          },
        });
        await this.activity.recordSystem(
          candidate,
          {
            eventType: ActivityEventType.APPROVAL_EXPIRED,
            action: "approval.expired",
            summary: "The review window elapsed without a decision.",
            ...(candidate.workflowId
              ? { workflowId: candidate.workflowId }
              : {}),
            approvalRequestId: candidate.id,
            resourceType: "APPROVAL_REQUEST",
            resourceId: candidate.id,
          },
          database,
        );
        if (execution.count === 1) {
          await this.activity.recordSystem(
            candidate,
            {
              eventType: ActivityEventType.WORKFLOW_EXECUTION_CHANGED,
              action: "workflow.execution_expired",
              summary: "Execution cancelled after review expired.",
              ...(candidate.workflowId
                ? { workflowId: candidate.workflowId }
                : {}),
              approvalRequestId: candidate.id,
              resourceType: "WORKFLOW_EXECUTION",
              resourceId: executionId,
            },
            database,
          );
        }
        return true;
      });
      if (changed) expired += 1;
    }
    return expired;
  }

  async decide(
    scope: VerifiedTenantScope,
    requestId: string,
    input: DecideApprovalDto,
  ) {
    return this.prisma.$transaction(async (database) => {
      const request = await database.approvalRequest.findFirst({
        where: {
          ...tenantOwnedWhere(scope, requestId),
          workflowExecutionId: { not: null },
        },
      });
      if (!request?.workflowExecutionId) unavailable();
      if (!canDecideApproval(request.status, input.decision))
        invalidTransition();
      if (request.expiresAt && request.expiresAt <= new Date())
        invalidTransition();
      const changed = await database.approvalRequest.updateMany({
        where: {
          ...tenantOwnedWhere(scope, requestId),
          status: ApprovalStatus.PENDING,
        },
        data: { status: input.decision },
      });
      if (changed.count !== 1) invalidTransition();
      const decision = await database.approvalDecision.create({
        data: {
          ...tenant(scope),
          requestId,
          actorMembershipId: scope.membershipId,
          decision: input.decision,
          ...(input.note ? { note: input.note } : {}),
        },
      });
      const next =
        input.decision === ApprovalStatus.APPROVED
          ? WorkflowExecutionStatus.QUEUED
          : WorkflowExecutionStatus.CANCELLED;
      const executionChanged = await database.workflowExecution.updateMany({
        where: {
          ...tenantOwnedWhere(scope, request.workflowExecutionId),
          status: WorkflowExecutionStatus.WAITING_FOR_APPROVAL,
        },
        data: {
          status: next,
          ...(next === WorkflowExecutionStatus.CANCELLED
            ? { completedAt: new Date() }
            : {}),
        },
      });
      if (executionChanged.count !== 1) invalidTransition();
      if (next === WorkflowExecutionStatus.QUEUED) {
        const execution = await database.workflowExecution.findFirstOrThrow({
          where: tenantOwnedWhere(scope, request.workflowExecutionId),
        });
        const step = await database.executionStep.findFirst({
          where: {
            ...tenant(scope),
            executionId: execution.id,
            stepNumber: 1,
          },
        });
        if (!step) invalidTransition();
        await this.enqueueAction(database, execution, step.actionType);
      }
      await this.activity.recordUser(
        scope,
        {
          eventType: ActivityEventType.APPROVAL_DECIDED,
          action: "approval.decided",
          summary: `Workflow request ${input.decision.toLowerCase()}.`,
          approvalRequestId: requestId,
          ...(request.workflowId ? { workflowId: request.workflowId } : {}),
          resourceType: "APPROVAL_REQUEST",
          resourceId: requestId,
          metadata: { decision: input.decision },
        },
        database,
      );
      await this.activity.recordUser(
        scope,
        {
          eventType: ActivityEventType.WORKFLOW_EXECUTION_CHANGED,
          action: "workflow.execution_after_review",
          summary: `Workflow execution entered ${next} after human review.`,
          ...(request.workflowId ? { workflowId: request.workflowId } : {}),
          approvalRequestId: requestId,
          resourceType: "WORKFLOW_EXECUTION",
          resourceId: request.workflowExecutionId,
          metadata: { status: next, decision: input.decision },
        },
        database,
      );
      return decision;
    });
  }

  private enqueueAction(
    database: Prisma.TransactionClient,
    execution: {
      id: string;
      organizationId: string;
      workspaceId: string;
    },
    actionType: WorkflowActionType,
  ) {
    return database.outboxEvent.create({
      data: {
        organizationId: execution.organizationId,
        workspaceId: execution.workspaceId,
        workflowExecutionId: execution.id,
        eventType:
          actionType === WorkflowActionType.INTERNAL_NOTIFICATION
            ? OutboxEventType.WORKFLOW_INTERNAL_NOTIFICATION
            : OutboxEventType.WORKFLOW_DRY_RUN,
        idempotencyKey: execution.id,
        payload: { executionId: execution.id },
        maxAttempts: 3,
      },
    });
  }

  /** Only a persisted internal notification or a no-op dry run is permitted. */
  async processWorkflowAction(event: OutboxEvent, now: Date): Promise<boolean> {
    return this.prisma.$transaction(async (database) => {
      const owned = await database.outboxEvent.findFirst({
        where: {
          id: event.id,
          organizationId: event.organizationId,
          workspaceId: event.workspaceId,
          eventType: event.eventType,
          status: OutboxEventStatus.PROCESSING,
          lockToken: event.lockToken,
        },
      });
      if (!owned?.workflowExecutionId) return false;
      const execution = await database.workflowExecution.findFirst({
        where: {
          id: owned.workflowExecutionId,
          organizationId: owned.organizationId,
          workspaceId: owned.workspaceId,
        },
      });
      if (!execution || execution.status !== WorkflowExecutionStatus.QUEUED)
        return false;
      const definition = execution.definitionVersionId
        ? await database.workflowDefinitionVersion.findFirst({
            where: {
              id: execution.definitionVersionId,
              organizationId: execution.organizationId,
              workspaceId: execution.workspaceId,
              workflowId: execution.workflowId,
            },
          })
        : null;
      if (execution.definitionVersionId && !definition) invalidTransition();
      const step = await database.executionStep.findFirst({
        where: {
          organizationId: execution.organizationId,
          workspaceId: execution.workspaceId,
          executionId: execution.id,
          stepNumber: 1,
          status: ExecutionStepStatus.PENDING,
        },
      });
      if (
        !step ||
        (definition && step.actionType !== definition.actionType) ||
        (event.eventType === OutboxEventType.WORKFLOW_DRY_RUN &&
          step.actionType !== WorkflowActionType.DRY_RUN_LOG) ||
        (event.eventType === OutboxEventType.WORKFLOW_INTERNAL_NOTIFICATION &&
          step.actionType !== WorkflowActionType.INTERNAL_NOTIFICATION)
      )
        return false;
      const claimed = await database.workflowExecution.updateMany({
        where: {
          id: execution.id,
          organizationId: execution.organizationId,
          workspaceId: execution.workspaceId,
          status: WorkflowExecutionStatus.QUEUED,
        },
        data: { status: WorkflowExecutionStatus.RUNNING, startedAt: now },
      });
      if (claimed.count !== 1) return false;
      await this.activity.recordSystem(
        execution,
        {
          eventType: ActivityEventType.WORKFLOW_EXECUTION_CHANGED,
          action: "workflow.execution_started",
          summary:
            step.actionType === WorkflowActionType.DRY_RUN_LOG
              ? "Dry run started; no external action was invoked."
              : "Approved internal notification action started.",
          workflowId: execution.workflowId,
          resourceType: "WORKFLOW_EXECUTION",
          resourceId: execution.id,
        },
        database,
      );
      if (step.actionType === WorkflowActionType.INTERNAL_NOTIFICATION) {
        const membership = execution.initiatedByMembershipId
          ? await database.membership.findFirst({
              where: {
                id: execution.initiatedByMembershipId,
                organizationId: execution.organizationId,
                status: MembershipStatus.ACTIVE,
              },
            })
          : null;
        const workspace = await database.workspace.findFirst({
          where: {
            id: execution.workspaceId,
            organizationId: execution.organizationId,
            status: WorkspaceStatus.ACTIVE,
            organization: { status: OrganizationStatus.ACTIVE },
          },
        });
        if (!membership || !workspace || !definition) invalidTransition();
        const notification = await database.notification.create({
          data: {
            organizationId: execution.organizationId,
            workspaceId: execution.workspaceId,
            recipientMembershipId: membership.id,
            workflowExecutionId: execution.id,
            title: definition.name,
            body:
              definition.description ||
              "This approved workflow created an internal notification.",
          },
        });
        await this.activity.recordSystem(
          execution,
          {
            eventType: ActivityEventType.NOTIFICATION_CREATED,
            action: "notification.created",
            summary: "An approved workflow created an internal notification.",
            workflowId: execution.workflowId,
            resourceType: "NOTIFICATION",
            resourceId: notification.id,
          },
          database,
        );
      }
      const stepChanged = await database.executionStep.updateMany({
        where: {
          organizationId: execution.organizationId,
          workspaceId: execution.workspaceId,
          executionId: execution.id,
          stepNumber: 1,
          status: ExecutionStepStatus.PENDING,
        },
        data: {
          status: ExecutionStepStatus.SUCCEEDED,
          startedAt: now,
          completedAt: now,
        },
      });
      if (stepChanged.count !== 1) invalidTransition();
      await this.activity.recordSystem(
        execution,
        {
          eventType: ActivityEventType.WORKFLOW_EXECUTION_CHANGED,
          action: "workflow.step_completed",
          summary:
            step.actionType === WorkflowActionType.DRY_RUN_LOG
              ? "The dry-run step completed without external side effects."
              : "The internal notification step was persisted.",
          workflowId: execution.workflowId,
          resourceType: "WORKFLOW_EXECUTION",
          resourceId: execution.id,
          metadata: { stepNumber: 1 },
        },
        database,
      );
      const completed = await database.workflowExecution.updateMany({
        where: {
          id: execution.id,
          organizationId: execution.organizationId,
          workspaceId: execution.workspaceId,
          status: WorkflowExecutionStatus.RUNNING,
        },
        data: { status: WorkflowExecutionStatus.SUCCEEDED, completedAt: now },
      });
      if (completed.count !== 1) invalidTransition();
      await this.activity.recordSystem(
        execution,
        {
          eventType: ActivityEventType.WORKFLOW_EXECUTION_CHANGED,
          action:
            step.actionType === WorkflowActionType.DRY_RUN_LOG
              ? "workflow.dry_run_completed"
              : "workflow.internal_notification_completed",
          summary:
            step.actionType === WorkflowActionType.DRY_RUN_LOG
              ? "Dry run completed without external side effects."
              : "Internal notification action completed without an external provider.",
          workflowId: execution.workflowId,
          resourceType: "WORKFLOW_EXECUTION",
          resourceId: execution.id,
        },
        database,
      );
      const outboxCompleted = await database.outboxEvent.updateMany({
        where: {
          id: owned.id,
          organizationId: owned.organizationId,
          workspaceId: owned.workspaceId,
          status: OutboxEventStatus.PROCESSING,
          lockToken: event.lockToken,
        },
        data: {
          status: OutboxEventStatus.COMPLETED,
          completedAt: now,
          lockToken: null,
          lockedAt: null,
          lastErrorCode: null,
        },
      });
      if (outboxCompleted.count !== 1) invalidTransition();
      return true;
    });
  }

  async failWorkflowAction(
    event: OutboxEvent,
    now: Date,
    retryable = false,
  ): Promise<OutboxEventStatus | "LEASE_LOST"> {
    return this.prisma.$transaction(async (database) => {
      const owned = await database.outboxEvent.findFirst({
        where: {
          id: event.id,
          organizationId: event.organizationId,
          workspaceId: event.workspaceId,
          eventType: event.eventType,
          status: OutboxEventStatus.PROCESSING,
          lockToken: event.lockToken,
        },
      });
      if (!owned) return "LEASE_LOST" as const;
      const nextStatus =
        retryable && owned.attempts < owned.maxAttempts
          ? OutboxEventStatus.PENDING
          : OutboxEventStatus.FAILED;
      const outboxFailed = await database.outboxEvent.updateMany({
        where: {
          id: owned.id,
          organizationId: owned.organizationId,
          workspaceId: owned.workspaceId,
          status: OutboxEventStatus.PROCESSING,
          lockToken: event.lockToken,
        },
        data: {
          status: nextStatus,
          ...(nextStatus === OutboxEventStatus.FAILED
            ? { completedAt: now }
            : {
                nextAttemptAt: new Date(
                  now.getTime() + outboxRetryDelayMs(owned.attempts),
                ),
              }),
          lockToken: null,
          lockedAt: null,
          lastErrorCode:
            nextStatus === OutboxEventStatus.FAILED
              ? "WORKFLOW_ACTION_FAILED"
              : "WORKFLOW_ACTION_RETRY",
        },
      });
      if (outboxFailed.count !== 1) invalidTransition();
      if (!owned.workflowExecutionId) return nextStatus;
      const execution = await database.workflowExecution.findFirst({
        where: {
          id: owned.workflowExecutionId,
          organizationId: owned.organizationId,
          workspaceId: owned.workspaceId,
        },
      });
      if (
        !execution ||
        (execution.status !== WorkflowExecutionStatus.QUEUED &&
          execution.status !== WorkflowExecutionStatus.RUNNING)
      )
        return nextStatus;
      if (nextStatus === OutboxEventStatus.PENDING) {
        await this.activity.recordSystem(
          execution,
          {
            eventType: ActivityEventType.WORKFLOW_EXECUTION_CHANGED,
            action: "workflow.action_retry_scheduled",
            summary: "The internal action will retry after a bounded delay.",
            workflowId: execution.workflowId,
            resourceType: "WORKFLOW_EXECUTION",
            resourceId: execution.id,
            metadata: { attempt: owned.attempts },
          },
          database,
        );
        return nextStatus;
      }
      const executionFailed = await database.workflowExecution.updateMany({
        where: {
          id: execution.id,
          organizationId: execution.organizationId,
          workspaceId: execution.workspaceId,
          status: execution.status,
        },
        data: { status: WorkflowExecutionStatus.FAILED, completedAt: now },
      });
      if (executionFailed.count !== 1) invalidTransition();
      await database.executionStep.updateMany({
        where: {
          organizationId: owned.organizationId,
          workspaceId: owned.workspaceId,
          executionId: execution.id,
          status: {
            in: [ExecutionStepStatus.PENDING, ExecutionStepStatus.RUNNING],
          },
        },
        data: { status: ExecutionStepStatus.FAILED, completedAt: now },
      });
      await this.activity.recordSystem(
        execution,
        {
          eventType: ActivityEventType.WORKFLOW_EXECUTION_CHANGED,
          action: "workflow.action_failed",
          summary: "Workflow action failed without an external provider call.",
          workflowId: execution.workflowId,
          resourceType: "WORKFLOW_EXECUTION",
          resourceId: execution.id,
        },
        database,
      );
      return nextStatus;
    });
  }
}
