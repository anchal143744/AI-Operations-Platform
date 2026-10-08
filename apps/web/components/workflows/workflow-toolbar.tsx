import { useRef } from "react";
import type { WorkflowFilterState } from "../../lib/workflows/model";
import { WorkflowFilters } from "./workflow-filters";
import { WorkflowSearch } from "./workflow-search";
import { WorkflowSort } from "./workflow-sort";

export function WorkflowToolbar({
  query,
  filters,
  filtersOpen,
  onQueryChange,
  onFiltersOpen,
  onFiltersClose,
  onFiltersChange,
}: {
  query: string;
  filters: WorkflowFilterState;
  filtersOpen: boolean;
  onQueryChange: (value: string) => void;
  onFiltersOpen: () => void;
  onFiltersClose: () => void;
  onFiltersChange: (value: WorkflowFilterState) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="ops-toolbar" aria-label="Workflow controls">
      <WorkflowSearch value={query} onChange={onQueryChange} />
      <div>
        <WorkflowFilters
          open={filtersOpen}
          filters={filters}
          triggerRef={triggerRef}
          onOpen={onFiltersOpen}
          onClose={onFiltersClose}
          onChange={onFiltersChange}
        />
        <WorkflowSort
          value={filters.sort}
          onChange={(sort) => onFiltersChange({ ...filters, sort })}
        />
      </div>
    </div>
  );
}
