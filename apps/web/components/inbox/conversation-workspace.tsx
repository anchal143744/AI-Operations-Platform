import type {
  Conversation,
  ConversationFilterState,
} from "../../lib/conversations/model";
import { ConversationList } from "./conversation-list";
import { ConversationPanel } from "./conversation-panel";
import { ConversationToolbar } from "./conversation-toolbar";

export function ConversationWorkspace({
  conversations,
  query,
  filters,
  filtersOpen,
  onQueryChange,
  onFiltersOpen,
  onFiltersClose,
  onFiltersChange,
  onUnavailable,
}: {
  conversations: readonly Conversation[];
  query: string;
  filters: ConversationFilterState;
  filtersOpen: boolean;
  onQueryChange: (query: string) => void;
  onFiltersOpen: () => void;
  onFiltersClose: () => void;
  onFiltersChange: (filters: ConversationFilterState) => void;
  onUnavailable: (message: string) => void;
}) {
  return (
    <section className="conversation-workspace" aria-labelledby="inbox-title">
      <div className="conversation-workspace-heading">
        <div>
          <p className="app-kicker">All conversations</p>
          <h2 id="inbox-title">Communication queue</h2>
        </div>
        <span>No data yet</span>
      </div>

      <ConversationToolbar
        query={query}
        filters={filters}
        filtersOpen={filtersOpen}
        onQueryChange={onQueryChange}
        onFiltersOpen={onFiltersOpen}
        onFiltersClose={onFiltersClose}
        onFiltersChange={onFiltersChange}
      />

      <div className="conversation-workspace-grid">
        <ConversationList
          conversations={conversations}
          query={query}
          filters={filters}
          onUnavailable={onUnavailable}
        />
        <ConversationPanel />
      </div>
    </section>
  );
}
