import {
  leadPriorityLabels,
  leadStatusLabels,
  type LeadPriority,
  type LeadStatus,
} from "../../lib/leads/model";

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`lead-status-badge lead-status-${status.toLowerCase()}`}>
      <span aria-hidden="true" />
      {leadStatusLabels[status]}
    </span>
  );
}

export function LeadPriorityIndicator({
  priority,
}: {
  priority: LeadPriority;
}) {
  return (
    <span className={`lead-priority lead-priority-${priority.toLowerCase()}`}>
      <span aria-hidden="true" />
      {leadPriorityLabels[priority]}
    </span>
  );
}
