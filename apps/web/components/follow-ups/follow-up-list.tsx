import {
  getActiveFollowUpFilterCount,
  getFollowUpEmptyState,
  type FollowUp,
  type FollowUpFilterState,
  type FollowUpView,
} from "../../lib/follow-ups/model";
import { FollowUpEmptyState } from "./follow-up-empty-state";
import { FollowUpListItem } from "./follow-up-list-item";

export function FollowUpList({
  followUps,
  query,
  filters,
  view,
  onCreate,
  onComplete,
  onReschedule,
}: {
  followUps: readonly FollowUp[];
  query: string;
  filters: FollowUpFilterState;
  view: FollowUpView;
  onCreate: () => void;
  onComplete: (id: string) => Promise<void>;
  onReschedule: (id: string, dueAt: string) => Promise<void>;
}) {
  const emptyState = getFollowUpEmptyState(query, filters, view);
  const canCreate =
    !query.trim() &&
    getActiveFollowUpFilterCount(filters) === 0 &&
    view === "ALL";

  return (
    <section
      className="follow-up-list-frame"
      aria-labelledby="follow-up-list-title"
    >
      <div className="follow-up-list-heading">
        <div>
          <h3 id="follow-up-list-title">Follow-up queue</h3>
          <span>{followUps.length === 0 ? "Empty" : followUps.length}</span>
        </div>
        <p>Next action, relationship, owner and due state</p>
      </div>

      <div className="follow-up-list-columns" aria-hidden="true">
        <span>Action</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Owner</span>
        <span>Due</span>
        <span>Actions</span>
      </div>

      {followUps.length === 0 ? (
        <FollowUpEmptyState
          title={emptyState.title}
          description={emptyState.description}
          canCreate={canCreate}
          onCreate={onCreate}
        />
      ) : (
        <ul className="follow-up-items">
          {followUps.map((followUp) => (
            <FollowUpListItem
              key={followUp.id}
              followUp={followUp}
              onComplete={onComplete}
              onReschedule={onReschedule}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
