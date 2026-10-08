import type {
  FollowUp,
  FollowUpFilterState,
  FollowUpView,
} from "../../lib/follow-ups/model";
import { FollowUpAISection } from "./follow-up-ai-section";
import { FollowUpContext } from "./follow-up-context";
import { FollowUpList } from "./follow-up-list";
import { FollowUpToolbar } from "./follow-up-toolbar";
import { FollowUpViews } from "./follow-up-views";

export function FollowUpWorkspace({
  followUps,
  query,
  filters,
  view,
  filtersOpen,
  onQueryChange,
  onViewChange,
  onFiltersOpen,
  onFiltersClose,
  onFiltersChange,
  onCreate,
  onComplete,
  onReschedule,
  total,
}: {
  followUps: readonly FollowUp[];
  query: string;
  filters: FollowUpFilterState;
  view: FollowUpView;
  filtersOpen: boolean;
  onQueryChange: (query: string) => void;
  onViewChange: (view: FollowUpView) => void;
  onFiltersOpen: () => void;
  onFiltersClose: () => void;
  onFiltersChange: (filters: FollowUpFilterState) => void;
  onCreate: () => void;
  onComplete: (id: string) => Promise<void>;
  onReschedule: (id: string, dueAt: string) => Promise<void>;
  total: number;
}) {
  return (
    <section
      className="follow-up-workspace"
      aria-labelledby="follow-up-workspace-title"
    >
      <div className="follow-up-section-heading">
        <div>
          <p className="app-kicker">Customer action queue</p>
          <h2 id="follow-up-workspace-title">What needs attention next</h2>
        </div>
        <p>{`${total} follow-up${total === 1 ? "" : "s"}`}</p>
      </div>

      <FollowUpViews value={view} onChange={onViewChange} />
      <FollowUpToolbar
        query={query}
        filters={filters}
        filtersOpen={filtersOpen}
        onQueryChange={onQueryChange}
        onFiltersOpen={onFiltersOpen}
        onFiltersClose={onFiltersClose}
        onFiltersChange={onFiltersChange}
      />

      <div className="follow-up-workspace-grid">
        <FollowUpList
          followUps={followUps}
          query={query}
          filters={filters}
          view={view}
          onCreate={onCreate}
          onComplete={onComplete}
          onReschedule={onReschedule}
        />
        <aside
          className="follow-up-context-rail"
          aria-label="Follow-up context"
        >
          <FollowUpContext />
          <FollowUpAISection />
        </aside>
      </div>
    </section>
  );
}
