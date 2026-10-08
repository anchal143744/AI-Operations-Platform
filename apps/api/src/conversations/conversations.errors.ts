import { NotFoundException } from "@nestjs/common";

export function conversationNotFound() {
  return new NotFoundException({
    statusCode: 404,
    code: "CONVERSATION_NOT_FOUND",
    message: "This conversation is not available in the selected workspace.",
  });
}

export function conversationLeadNotFound() {
  return new NotFoundException({
    statusCode: 404,
    code: "LEAD_NOT_FOUND",
    message: "The selected lead is not available in this workspace.",
  });
}
