import {
  followUpPriorityLabels,
  followUpStatusLabels,
  type FollowUpPriority,
  type FollowUpStatus,
} from "../../lib/follow-ups/model";

export function FollowUpStatusBadge({ status }: { status: FollowUpStatus }) {
  return (
    <span
      className={`follow-up-status-badge follow-up-status-${status.toLowerCase()}`}
    >
      <span aria-hidden="true" />
      {followUpStatusLabels[status]}
    </span>
  );
}

export function FollowUpPriorityIndicator({
  priority,
}: {
  priority: FollowUpPriority;
}) {
  return (
    <span
      className={`follow-up-priority follow-up-priority-${priority.toLowerCase()}`}
    >
      <span aria-hidden="true" />
      {followUpPriorityLabels[priority]}
    </span>
  );
}
