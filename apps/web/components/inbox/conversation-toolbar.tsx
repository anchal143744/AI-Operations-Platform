import { useRef } from "react";
import type { ConversationFilterState } from "../../lib/conversations/model";
import { ConversationFilters } from "./conversation-filters";
import { ConversationSearch } from "./conversation-search";
import { ConversationSort } from "./conversation-sort";

export function ConversationToolbar({
  query,
  filters,
  filtersOpen,
  onQueryChange,
  onFiltersOpen,
  onFiltersClose,
  onFiltersChange,
}: {
  query: string;
  filters: ConversationFilterState;
  filtersOpen: boolean;
  onQueryChange: (query: string) => void;
  onFiltersOpen: () => void;
  onFiltersClose: () => void;
  onFiltersChange: (filters: ConversationFilterState) => void;
}) {
  const filterTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="conversation-toolbar" aria-label="Conversation controls">
      <ConversationSearch value={query} onChange={onQueryChange} />
      <div className="conversation-toolbar-actions">
        <ConversationFilters
          open={filtersOpen}
          filters={filters}
          triggerRef={filterTriggerRef}
          onOpen={onFiltersOpen}
          onClose={onFiltersClose}
          onChange={onFiltersChange}
        />
        <ConversationSort
          value={filters.sort}
          onChange={(sort) => onFiltersChange({ ...filters, sort })}
        />
      </div>
    </div>
  );
}
