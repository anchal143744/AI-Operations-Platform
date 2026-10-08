import { useRef } from "react";
import type { AIOperationFilterState } from "../../lib/ai-operations/model";
import { AIOperationsFilters } from "./ai-operations-filters";
import { AIOperationsSearch } from "./ai-operations-search";
import { AIOperationsSort } from "./ai-operations-sort";

export function AIOperationsToolbar({
  query,
  filters,
  filtersOpen,
  onQueryChange,
  onFiltersOpen,
  onFiltersClose,
  onFiltersChange,
}: {
  query: string;
  filters: AIOperationFilterState;
  filtersOpen: boolean;
  onQueryChange: (value: string) => void;
  onFiltersOpen: () => void;
  onFiltersClose: () => void;
  onFiltersChange: (value: AIOperationFilterState) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="ops-toolbar" aria-label="AI operation controls">
      <AIOperationsSearch value={query} onChange={onQueryChange} />
      <div>
        <AIOperationsFilters
          open={filtersOpen}
          filters={filters}
          triggerRef={triggerRef}
          onOpen={onFiltersOpen}
          onClose={onFiltersClose}
          onChange={onFiltersChange}
        />
        <AIOperationsSort
          value={filters.sort}
          onChange={(sort) => onFiltersChange({ ...filters, sort })}
        />
      </div>
    </div>
  );
}
