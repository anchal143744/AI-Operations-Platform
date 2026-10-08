import type {
  ApprovalDecision,
  ApprovalFilterState,
  ApprovalRequest,
  ApprovalView,
} from "../../lib/approvals/model";
import { getApprovalEmptyState } from "../../lib/approvals/state";
import { ApprovalEmptyState } from "./approval-empty-state";

export function ApprovalList({
  requests,
  query,
  filters,
  view,
}: {
  requests: readonly ApprovalRequest[];
  query: string;
  filters: ApprovalFilterState;
  view: ApprovalView;
}) {
  if (!requests.length) {
    const state = getApprovalEmptyState(query, filters, view);
    return (
      <ApprovalEmptyState
        title={state.title}
        description={state.description}
        showConnections={!query && view === "ALL"}
      />
    );
  }

  return (
    <div className="approval-list" aria-label="Review requests">
      {requests.map((request) => (
        <ApprovalListItem key={request.id} request={request} />
      ))}
    </div>
  );
}

export function ApprovalListItem({
  request,
  decision = null,
}: {
  request: ApprovalRequest;
  decision?: ApprovalDecision | null;
}) {
  return (
    <article>
      <strong>{request.title}</strong>
      <span>{request.requestedAction}</span>
      <span>{request.source.type}</span>
      <span>{request.priority}</span>
      <span>{request.status}</span>
      <p>{request.reason}</p>
      <time dateTime={request.createdAt}>{request.createdAt}</time>
      <span>{decision?.reviewerId ?? "Unassigned"}</span>
    </article>
  );
}
