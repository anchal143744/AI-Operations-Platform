import { ConflictException } from "@nestjs/common";
import { OutboxEventStatus, OutboxEventType } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { OutboxWorkerService } from "../src/outbox/outbox-worker.service";

const event = {
  id: "workflow-event",
  eventType: OutboxEventType.WORKFLOW_INTERNAL_NOTIFICATION,
  exhausted: false,
  attempts: 1,
  maxAttempts: 3,
};

function fixture(overrides: Partial<typeof event> = {}) {
  const outbox = {
    claimNext: vi.fn().mockResolvedValue({ ...event, ...overrides }),
  };
  const workflows = {
    expireApprovals: vi.fn().mockResolvedValue(0),
    recoverStaleExecutions: vi.fn().mockResolvedValue(0),
    processWorkflowAction: vi.fn().mockResolvedValue(true),
    failWorkflowAction: vi.fn().mockResolvedValue(OutboxEventStatus.PENDING),
  };
  const worker = new OutboxWorkerService(
    {} as never,
    outbox as never,
    {} as never,
    {} as never,
    workflows as never,
  );
  return { worker, outbox, workflows };
}

describe("workflow outbox reliability", () => {
  it("completes one leased internal action without a failure path", async () => {
    const { worker, workflows } = fixture();
    expect(await worker.processNext(new Date("2026-10-07T00:00:00Z"))).toEqual({
      processed: true,
      status: OutboxEventStatus.COMPLETED,
    });
    expect(workflows.processWorkflowAction).toHaveBeenCalledOnce();
    expect(workflows.failWorkflowAction).not.toHaveBeenCalled();
  });

  it("schedules a bounded retry for a transient processing error", async () => {
    const { worker, workflows } = fixture();
    workflows.processWorkflowAction.mockRejectedValueOnce(
      new Error("temporary"),
    );
    expect(await worker.processNext(new Date("2026-10-07T00:00:00Z"))).toEqual({
      processed: true,
      status: OutboxEventStatus.PENDING,
    });
    expect(workflows.failWorkflowAction).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: OutboxEventType.WORKFLOW_INTERNAL_NOTIFICATION,
      }),
      expect.any(Date),
      true,
    );
  });

  it("does not retry a permanently invalid workflow transition", async () => {
    const { worker, workflows } = fixture();
    workflows.processWorkflowAction.mockRejectedValueOnce(
      new ConflictException("invalid transition"),
    );
    workflows.failWorkflowAction.mockResolvedValueOnce(
      OutboxEventStatus.FAILED,
    );
    expect(await worker.processNext(new Date("2026-10-07T00:00:00Z"))).toEqual({
      processed: true,
      status: OutboxEventStatus.FAILED,
    });
    expect(workflows.failWorkflowAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Date),
      false,
    );
  });

  it("fails an exhausted reclaimed lease without processing it again", async () => {
    const { worker, workflows } = fixture({ exhausted: true });
    workflows.failWorkflowAction.mockResolvedValueOnce(
      OutboxEventStatus.FAILED,
    );
    expect(await worker.processNext(new Date("2026-10-07T00:00:00Z"))).toEqual({
      processed: true,
      status: OutboxEventStatus.FAILED,
    });
    expect(workflows.processWorkflowAction).not.toHaveBeenCalled();
  });
});
