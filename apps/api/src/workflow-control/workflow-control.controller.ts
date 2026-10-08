import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { CurrentTenant } from "../authorization/current-tenant.decorator.js";
import { Permissions } from "../authorization/permissions.js";
import { RequirePermission } from "../authorization/require-permission.decorator.js";
import type { VerifiedTenantScope } from "../tenancy/tenant-scope.js";
import {
  ChangePolicyDto,
  ChangeWorkflowStatusDto,
  CreateWorkflowDto,
  DecideApprovalDto,
  RequestDryRunDto,
  UpdateWorkflowDefinitionDto,
} from "./workflow-control.dto.js";
import { WorkflowControlService } from "./workflow-control.service.js";

const uuid = () => new ParseUUIDPipe({ version: "4" });

@Controller("workflows")
export class WorkflowsController {
  constructor(private readonly control: WorkflowControlService) {}

  @Get()
  @RequirePermission(Permissions.WORKFLOWS_READ)
  list(@CurrentTenant() scope: VerifiedTenantScope) {
    return this.control.listWorkflows(scope);
  }

  @Get("summary")
  @RequirePermission(Permissions.WORKFLOWS_READ)
  summary(@CurrentTenant() scope: VerifiedTenantScope) {
    return this.control.summary(scope);
  }

  @Get(":workflowId")
  @RequirePermission(Permissions.WORKFLOWS_READ)
  detail(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Param("workflowId", uuid()) id: string,
  ) {
    return this.control.getWorkflow(scope, id);
  }

  @Get(":workflowId/versions")
  @RequirePermission(Permissions.WORKFLOWS_READ)
  versions(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Param("workflowId", uuid()) id: string,
  ) {
    return this.control.listVersions(scope, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(Permissions.WORKFLOWS_MANAGE)
  create(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Body() input: CreateWorkflowDto,
  ) {
    return this.control.createWorkflow(scope, input);
  }

  @Patch(":workflowId/definition")
  @RequirePermission(Permissions.WORKFLOWS_MANAGE)
  definition(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Param("workflowId", uuid()) id: string,
    @Body() input: UpdateWorkflowDefinitionDto,
  ) {
    return this.control.changeDefinition(scope, id, input);
  }

  @Patch(":workflowId/status")
  @RequirePermission(Permissions.WORKFLOWS_MANAGE)
  status(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Param("workflowId", uuid()) id: string,
    @Body() input: ChangeWorkflowStatusDto,
  ) {
    return this.control.changeStatus(scope, id, input.status);
  }

  @Patch(":workflowId/policy")
  @RequirePermission(Permissions.WORKFLOWS_MANAGE)
  policy(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Param("workflowId", uuid()) id: string,
    @Body() input: ChangePolicyDto,
  ) {
    return this.control.changePolicy(scope, id, input);
  }

  @Get(":workflowId/executions")
  @RequirePermission(Permissions.WORKFLOWS_READ)
  executions(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Param("workflowId", uuid()) id: string,
  ) {
    return this.control.listExecutions(scope, id);
  }

  @Post(":workflowId/executions")
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(Permissions.WORKFLOWS_EXECUTE)
  execute(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Param("workflowId", uuid()) id: string,
    @Body() input: RequestDryRunDto,
  ) {
    return this.control.requestExecution(scope, id, input.idempotencyKey);
  }
}

@Controller("approvals")
export class ApprovalsController {
  constructor(private readonly control: WorkflowControlService) {}

  @Get()
  @RequirePermission(Permissions.APPROVALS_READ)
  list(@CurrentTenant() scope: VerifiedTenantScope) {
    return this.control.listApprovals(scope);
  }

  @Get("summary")
  @RequirePermission(Permissions.APPROVALS_READ)
  summary(@CurrentTenant() scope: VerifiedTenantScope) {
    return this.control.approvalSummary(scope);
  }

  @Post(":requestId/decisions")
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(Permissions.APPROVALS_DECIDE)
  decide(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Param("requestId", uuid()) id: string,
    @Body() input: DecideApprovalDto,
  ) {
    return this.control.decide(scope, id, input);
  }
}
