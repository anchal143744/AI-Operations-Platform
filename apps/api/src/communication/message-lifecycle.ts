import { MessageStatus } from "@prisma/client";
import { CommunicationError } from "./communication.errors.js";

const transitions: Readonly<Record<MessageStatus, readonly MessageStatus[]>> = {
  DRAFT: [MessageStatus.QUEUED, MessageStatus.CANCELLED],
  PENDING_REVIEW: [MessageStatus.APPROVED, MessageStatus.CANCELLED],
  APPROVED: [MessageStatus.QUEUED, MessageStatus.CANCELLED],
  SENT: [],
  QUEUED: [
    MessageStatus.SUBMITTED,
    MessageStatus.FAILED,
    MessageStatus.CANCELLED,
  ],
  SUBMITTED: [MessageStatus.PROVIDER_ACCEPTED, MessageStatus.FAILED],
  PROVIDER_ACCEPTED: [MessageStatus.DELIVERED, MessageStatus.FAILED],
  DELIVERED: [MessageStatus.READ],
  READ: [],
  FAILED: [MessageStatus.QUEUED, MessageStatus.CANCELLED],
  CANCELLED: [],
};

export function assertMessageTransition(
  from: MessageStatus,
  to: MessageStatus,
) {
  if (!transitions[from].includes(to)) {
    throw new CommunicationError(
      "INVALID_MESSAGE_STATE",
      `Transition from ${from} to ${to} is not allowed.`,
    );
  }
}

export const messageLifecycle = transitions;
