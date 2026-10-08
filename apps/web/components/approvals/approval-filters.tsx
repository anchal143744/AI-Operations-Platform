"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  approvalPriorities,
  approvalSourceLabels,
  approvalSourceTypes,
  approvalStatusLabels,
  approvalStatuses,
  requestedActionLabels,
  requestedActionTypes,
  type ApprovalFilterState,
  type ApprovalPriority,
  type ApprovalSourceType,
  type ApprovalStatus,
  type RequestedActionType,
} from "../../lib/approvals/model";
import {
  getActiveApprovalFilterCount,
  initialApprovalFilterState,
  toggleApprovalFilterValue,
} from "../../lib/approvals/state";
import { leadPriorityLabels } from "../../lib/leads/model";
import { Icon } from "../icons";

export function ApprovalFilters({
  open,
  filters,
  triggerRef,
  onOpen,
  onClose,
  onChange,
}: {
  open: boolean;
  filters: ApprovalFilterState;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
  onClose: () => void;
  onChange: (filters: ApprovalFilterState) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const count = getActiveApprovalFilterCount(filters);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => closeRef.current?.focus());
    const previousOverflow = document.body.style.overflow;
    const mobile = window.matchMedia("(max-width: 38rem)").matches;
    if (mobile) document.body.style.overflow = "hidden";

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onClose();
      requestAnimationFrame(() => triggerRef.current?.focus());
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      if (mobile) document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, open, triggerRef]);

  const closeAndRestore = () => {
    onClose();
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const keepFocusInside = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const nodes = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), select:not([disabled])",
      ),
    );
    const first = nodes[0];
    const last = nodes.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="ops-filter-root">
      <button
        className="ops-control"
        type="button"
        ref={triggerRef}
        aria-expanded={open}
        aria-controls="approval-filter-panel"
        onClick={open ? closeAndRestore : onOpen}
      >
        <Icon name="sliders" size="small" />
        Filters
        {count ? (
          <span aria-label={`${count} active filters`}>{count}</span>
        ) : null}
      </button>

      {open ? (
        <div className="ops-filter-layer">
          <button
            type="button"
            tabIndex={-1}
            className="ops-filter-backdrop"
            aria-label="Close approval filters"
            onClick={closeAndRestore}
          />
          <div
            className="ops-filter-panel approval-filter-panel"
            id="approval-filter-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Filter review requests"
            onKeyDown={keepFocusInside}
          >
            <div className="ops-filter-heading">
              <div>
                <strong>Filter review requests</strong>
                <small>No approval data is connected</small>
              </div>
              <button
                type="button"
                ref={closeRef}
                aria-label="Close approval filters"
                onClick={closeAndRestore}
              >
                <Icon name="x" size="small" />
              </button>
            </div>

            <FilterGroup legend="Status">
              {approvalStatuses.map((status) => (
                <FilterOption
                  key={status}
                  label={approvalStatusLabels[status]}
                  checked={filters.statuses.includes(status)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      statuses: toggleApprovalFilterValue<ApprovalStatus>(
                        filters.statuses,
                        status,
                      ),
                    })
                  }
                />
              ))}
            </FilterGroup>
            <FilterGroup legend="Priority">
              {approvalPriorities.map((priority) => (
                <FilterOption
                  key={priority}
                  label={leadPriorityLabels[priority]}
                  checked={filters.priorities.includes(priority)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      priorities: toggleApprovalFilterValue<ApprovalPriority>(
                        filters.priorities,
                        priority,
                      ),
                    })
                  }
                />
              ))}
            </FilterGroup>
            <FilterGroup legend="Source">
              {approvalSourceTypes.map((source) => (
                <FilterOption
                  key={source}
                  label={approvalSourceLabels[source]}
                  checked={filters.sources.includes(source)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      sources: toggleApprovalFilterValue<ApprovalSourceType>(
                        filters.sources,
                        source,
                      ),
                    })
                  }
                />
              ))}
            </FilterGroup>
            <FilterGroup legend="Requested action">
              {requestedActionTypes.map((action) => (
                <FilterOption
                  key={action}
                  label={requestedActionLabels[action]}
                  checked={filters.actions.includes(action)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      actions: toggleApprovalFilterValue<RequestedActionType>(
                        filters.actions,
                        action,
                      ),
                    })
                  }
                />
              ))}
            </FilterGroup>
            <FilterGroup legend="Reviewer">
              <FilterOption
                label="Unassigned"
                checked={filters.reviewers.includes("UNASSIGNED")}
                onChange={() =>
                  onChange({
                    ...filters,
                    reviewers: toggleApprovalFilterValue(
                      filters.reviewers,
                      "UNASSIGNED",
                    ),
                  })
                }
              />
            </FilterGroup>

            <div className="ops-filter-actions">
              <button
                type="button"
                disabled={!count}
                onClick={() => onChange(initialApprovalFilterState)}
              >
                Clear filters
              </button>
              <button type="button" onClick={closeAndRestore}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterGroup({
  legend,
  children,
}: {
  legend: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="ops-filter-group">
      <legend>{legend}</legend>
      <div>{children}</div>
    </fieldset>
  );
}

function FilterOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="ops-filter-option">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}
