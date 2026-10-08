import Link from "next/link";
import {
  getActiveLeadFilterCount,
  getLeadEmptyState,
  leadSourceLabels,
  type Lead,
  type LeadFilterState,
} from "../../lib/leads/model";
import { LeadEmptyState } from "./lead-empty-state";
import { LeadPriorityIndicator, LeadStatusBadge } from "./lead-indicators";

export function LeadList({
  leads,
  query,
  filters,
  onAddLead,
}: {
  leads: readonly Lead[];
  query: string;
  filters: LeadFilterState;
  onAddLead: () => void;
}) {
  if (leads.length === 0) {
    const emptyState = getLeadEmptyState(query, filters);
    return (
      <div className="lead-list-frame">
        <div className="lead-table-head" aria-hidden="true">
          <span>Lead</span>
          <span>Company</span>
          <span>Status</span>
          <span>Priority</span>
          <span>Source</span>
          <span>Owner</span>
          <span>Last activity</span>
          <span>Next follow-up</span>
        </div>
        <LeadEmptyState
          title={emptyState.title}
          description={emptyState.description}
          canAddLead={!query.trim() && getActiveLeadFilterCount(filters) === 0}
          onAddLead={onAddLead}
        />
      </div>
    );
  }

  return (
    <div className="lead-list-frame">
      <div className="lead-table-head" aria-hidden="true">
        <span>Lead</span>
        <span>Company</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Source</span>
        <span>Owner</span>
        <span>Last activity</span>
        <span>Next follow-up</span>
      </div>
      <ul className="lead-records" aria-label="Leads in selected workspace">
        {leads.map((lead) => (
          <li key={lead.id}>
            <Link
              className="lead-record-row"
              href={`/leads/${lead.id}`}
              aria-label={`Open ${lead.name}, ${lead.status.toLowerCase()} lead in selected workspace`}
            >
              <strong>{lead.name}</strong>
              <span data-label="Company">{lead.company ?? "—"}</span>
              <LeadStatusBadge status={lead.status} />
              <LeadPriorityIndicator priority={lead.priority} />
              <span data-label="Source">{leadSourceLabels[lead.source]}</span>
              <span data-label="Owner">{lead.owner ?? "Unassigned"}</span>
              <span data-label="Last activity">
                {lead.lastActivityAt
                  ? new Date(lead.lastActivityAt).toLocaleDateString()
                  : "—"}
              </span>
              <span data-label="Next follow-up">
                {lead.nextFollowUpAt
                  ? new Date(lead.nextFollowUpAt).toLocaleDateString()
                  : "—"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
