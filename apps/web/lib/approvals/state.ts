import {
  approvalViews,
  type ApprovalFilterState,
  type ApprovalRequest,
  type ApprovalView,
} from "./model";

export const initialApprovalFilterState: ApprovalFilterState = {
  statuses: [],
  priorities: [],
  sources: [],
  actions: [],
  reviewers: [],
  sort: "NEWEST",
};

export const emptyApprovalRequests: readonly ApprovalRequest[] = [];

export function toggleApprovalFilterValue<T extends string>(
  values: readonly T[],
  value: T,
): readonly T[] {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
}

export function getActiveApprovalFilterCount(filters: ApprovalFilterState) {
  return (
    filters.statuses.length +
    filters.priorities.length +
    filters.sources.length +
    filters.actions.length +
    filters.reviewers.length
  );
}

export function getApprovalEmptyState(
  query: string,
  filters: ApprovalFilterState,
  view: ApprovalView,
) {
  if (query.trim()) {
    return {
      title: "No review requests match your search.",
      description:
        "Try another title, action, source, owner or reviewer when approval data is connected.",
    };
  }

  if (getActiveApprovalFilterCount(filters)) {
    return {
      title: "No review requests match these filters.",
      description: "Clear one or more filters to return to the full queue.",
    };
  }

  if (view !== "ALL") {
    const label = approvalViews.find((item) => item.value === view)?.label;
    return {
      title: `No ${label?.toLowerCase()} requests`,
      description:
        "This view will update when the approval service is connected.",
    };
  }

  return {
    title: "No actions need your review",
    description:
      "When AI or automated workflows require human approval, they will appear here.",
  };
}
