import {
  type ActivityEvent,
  type ActivityFilterState,
  type ActivityView,
} from "./model";

export const initialActivityFilterState: ActivityFilterState = {
  eventTypes: [],
  sources: [],
  statuses: [],
  actors: [],
  priorities: [],
  dateRange: "ANY",
  sort: "NEWEST",
};

export function toggleActivityFilterValue<T extends string>(
  values: readonly T[],
  value: T,
): readonly T[] {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
}

export function getActiveActivityFilterCount(filters: ActivityFilterState) {
  return (
    filters.eventTypes.length +
    filters.sources.length +
    filters.statuses.length +
    filters.actors.length +
    filters.priorities.length +
    (filters.dateRange === "ANY" ? 0 : 1)
  );
}

export function getActivityEmptyState(
  query: string,
  filters: ActivityFilterState,
  view: ActivityView,
) {
  if (query.trim()) {
    return {
      title: "No activity matches your search.",
      description: "Try another action or actor in the selected workspace.",
    };
  }
  if (getActiveActivityFilterCount(filters)) {
    return {
      title: "No activity matches these filters.",
      description: "Clear one or more filters to return to all activity.",
    };
  }
  if (view !== "ALL") {
    return {
      title: "No activity in this view",
      description:
        "No recorded events match this view in the selected workspace.",
    };
  }
  return {
    title: "No activity recorded yet",
    description:
      "Supported operational events will appear here after actions occur in this workspace.",
  };
}

export function selectActivityEvents(
  events: readonly ActivityEvent[],
): readonly ActivityEvent[] {
  return events;
}
