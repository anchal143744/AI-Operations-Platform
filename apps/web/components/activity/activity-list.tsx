import type {
  ActivityEvent,
  ActivityFilterState,
  ActivityView,
} from "../../lib/activity/model";
import { getActivityEmptyState } from "../../lib/activity/state";
import { ActivityEmptyState } from "./activity-empty-state";

export function ActivityList({
  events,
  query,
  filters,
  view,
  selectedId,
  onSelect,
}: {
  events: readonly ActivityEvent[];
  query: string;
  filters: ActivityFilterState;
  view: ActivityView;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!events.length) {
    const state = getActivityEmptyState(query, filters, view);
    return (
      <ActivityEmptyState title={state.title} description={state.description} />
    );
  }

  return (
    <div className="activity-list" role="list" aria-label="Activity events">
      {events.map((event) => (
        <ActivityEventItem
          key={event.id}
          event={event}
          selected={event.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function ActivityEventItem({
  event,
  selected,
  onSelect,
}: {
  event: ActivityEvent;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <article role="listitem" className="activity-event">
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(event.id)}
      >
        <strong>{event.action}</strong>
        <span>{event.type.replaceAll("_", " ")}</span>
        <p>{event.summary}</p>
        <time dateTime={event.createdAt}>
          {new Date(event.createdAt).toLocaleString()}
        </time>
      </button>
    </article>
  );
}
