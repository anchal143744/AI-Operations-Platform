import { useRef } from "react";
import type { ApprovalFilterState } from "../../lib/approvals/model";
import { ApprovalFilters } from "./approval-filters";
import { ApprovalSearch } from "./approval-search";
import { ApprovalSort } from "./approval-sort";

export function ApprovalToolbar({
  query,
  filters,
  filtersOpen,
  onQueryChange,
  onFiltersOpen,
  onFiltersClose,
  onFiltersChange,
}: {
  query: string;
  filters: ApprovalFilterState;
  filtersOpen: boolean;
  onQueryChange: (value: string) => void;
  onFiltersOpen: () => void;
  onFiltersClose: () => void;
  onFiltersChange: (value: ApprovalFilterState) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="ops-toolbar" aria-label="Approval controls">
      <ApprovalSearch value={query} onChange={onQueryChange} />
      <div>
        <ApprovalFilters
          open={filtersOpen}
          filters={filters}
          triggerRef={triggerRef}
          onOpen={onFiltersOpen}
          onClose={onFiltersClose}
          onChange={onFiltersChange}
        />
        <ApprovalSort
          value={filters.sort}
          onChange={(sort) => onFiltersChange({ ...filters, sort })}
        />
      </div>
    </div>
  );
}
