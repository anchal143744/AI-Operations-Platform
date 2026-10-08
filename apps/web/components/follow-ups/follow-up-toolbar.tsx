import { useRef } from "react";
import type { FollowUpFilterState } from "../../lib/follow-ups/model";
import { FollowUpFilters } from "./follow-up-filters";
import { FollowUpSearch } from "./follow-up-search";
import { FollowUpSort } from "./follow-up-sort";

export function FollowUpToolbar({
  query,
  filters,
  filtersOpen,
  onQueryChange,
  onFiltersOpen,
  onFiltersClose,
  onFiltersChange,
}: {
  query: string;
  filters: FollowUpFilterState;
  filtersOpen: boolean;
  onQueryChange: (query: string) => void;
  onFiltersOpen: () => void;
  onFiltersClose: () => void;
  onFiltersChange: (filters: FollowUpFilterState) => void;
}) {
  const filterTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="follow-up-toolbar" aria-label="Follow-up controls">
      <FollowUpSearch value={query} onChange={onQueryChange} />
      <div className="follow-up-toolbar-actions">
        <FollowUpFilters
          open={filtersOpen}
          filters={filters}
          triggerRef={filterTriggerRef}
          onOpen={onFiltersOpen}
          onClose={onFiltersClose}
          onChange={onFiltersChange}
        />
        <FollowUpSort
          value={filters.sort}
          onChange={(sort) => onFiltersChange({ ...filters, sort })}
        />
      </div>
    </div>
  );
}
