import { useRef } from "react";
import type { ActivityFilterState } from "../../lib/activity/model";
import { ActivityFilters } from "./activity-filters";
import { ActivitySearch } from "./activity-search";
import { ActivitySort } from "./activity-sort";

export function ActivityToolbar({
  query,
  filters,
  filtersOpen,
  onQueryChange,
  onFiltersOpen,
  onFiltersClose,
  onFiltersChange,
}: {
  query: string;
  filters: ActivityFilterState;
  filtersOpen: boolean;
  onQueryChange: (value: string) => void;
  onFiltersOpen: () => void;
  onFiltersClose: () => void;
  onFiltersChange: (value: ActivityFilterState) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="ops-toolbar" aria-label="Activity controls">
      <ActivitySearch value={query} onChange={onQueryChange} />
      <div>
        <ActivityFilters
          open={filtersOpen}
          filters={filters}
          triggerRef={triggerRef}
          onOpen={onFiltersOpen}
          onClose={onFiltersClose}
          onChange={onFiltersChange}
        />
        <ActivitySort
          value={filters.sort}
          onChange={(sort) => onFiltersChange({ ...filters, sort })}
        />
      </div>
    </div>
  );
}
