import { useRef } from "react";
import {
  leadSortOptions,
  type LeadFilterState,
  type LeadSortOption,
} from "../../lib/leads/model";
import { Icon } from "../icons";
import { LeadFilters } from "./lead-filters";
import { LeadSearch } from "./lead-search";

export function LeadToolbar({
  query,
  filters,
  filtersOpen,
  onQueryChange,
  onFiltersOpen,
  onFiltersClose,
  onFiltersChange,
}: {
  query: string;
  filters: LeadFilterState;
  filtersOpen: boolean;
  onQueryChange: (query: string) => void;
  onFiltersOpen: () => void;
  onFiltersClose: () => void;
  onFiltersChange: (filters: LeadFilterState) => void;
}) {
  const filterTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="lead-toolbar" aria-label="Lead list controls">
      <LeadSearch value={query} onChange={onQueryChange} />
      <div className="lead-toolbar-actions">
        <LeadFilters
          open={filtersOpen}
          filters={filters}
          triggerRef={filterTriggerRef}
          onOpen={onFiltersOpen}
          onClose={onFiltersClose}
          onChange={onFiltersChange}
        />
        <label className="lead-sort">
          <span>Sort leads</span>
          <select
            value={filters.sort}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                sort: event.currentTarget.value as LeadSortOption,
              })
            }
          >
            {leadSortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" size="small" />
        </label>
      </div>
    </div>
  );
}
