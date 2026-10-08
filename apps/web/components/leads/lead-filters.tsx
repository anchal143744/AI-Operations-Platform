"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  getActiveLeadFilterCount,
  initialLeadFilterState,
  leadPriorities,
  leadSources,
  leadSourceLabels,
  leadStatuses,
  toggleLeadFilterValue,
  type LeadFilterState,
  type LeadPriority,
  type LeadSource,
  type LeadStatus,
} from "../../lib/leads/model";
import { Icon } from "../icons";
import { LeadPriorityIndicator, LeadStatusBadge } from "./lead-indicators";

export function LeadFilters({
  open,
  filters,
  triggerRef,
  onOpen,
  onClose,
  onChange,
}: {
  open: boolean;
  filters: LeadFilterState;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
  onClose: () => void;
  onChange: (filters: LeadFilterState) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const activeCount = getActiveLeadFilterCount(filters);

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

  const closeAndRestoreFocus = () => {
    onClose();
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const keepFocusInside = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = focusable[0];
    const last = focusable.at(-1);
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
    <div className="lead-filter-root">
      <button
        className="lead-toolbar-control"
        type="button"
        ref={triggerRef}
        aria-expanded={open}
        aria-controls="lead-filter-panel"
        onClick={open ? closeAndRestoreFocus : onOpen}
      >
        <Icon name="sliders" size="small" />
        Filters
        {activeCount > 0 ? (
          <span
            className="lead-filter-count"
            aria-label={`${activeCount} active filters`}
          >
            {activeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="lead-filter-layer">
          <button
            className="lead-filter-backdrop"
            type="button"
            tabIndex={-1}
            aria-label="Close lead filters"
            onClick={closeAndRestoreFocus}
          />
          <div
            className="lead-filter-panel"
            id="lead-filter-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Filter leads"
            onKeyDown={keepFocusInside}
          >
            <div className="lead-filter-heading">
              <div>
                <span>Filter leads</span>
                <small>No lead data is connected</small>
              </div>
              <button
                type="button"
                ref={closeRef}
                aria-label="Close lead filters"
                onClick={closeAndRestoreFocus}
              >
                <Icon name="x" size="small" />
              </button>
            </div>

            <FilterGroup legend="Status">
              {leadStatuses.map((status) => (
                <FilterOption
                  key={status}
                  checked={filters.statuses.includes(status)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      statuses: toggleLeadFilterValue<LeadStatus>(
                        filters.statuses,
                        status,
                      ),
                    })
                  }
                >
                  <LeadStatusBadge status={status} />
                </FilterOption>
              ))}
            </FilterGroup>

            <FilterGroup legend="Priority">
              {leadPriorities.map((priority) => (
                <FilterOption
                  key={priority}
                  checked={filters.priorities.includes(priority)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      priorities: toggleLeadFilterValue<LeadPriority>(
                        filters.priorities,
                        priority,
                      ),
                    })
                  }
                >
                  <LeadPriorityIndicator priority={priority} />
                </FilterOption>
              ))}
            </FilterGroup>

            <FilterGroup legend="Source">
              {leadSources.map((source) => (
                <FilterOption
                  key={source}
                  checked={filters.sources.includes(source)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      sources: toggleLeadFilterValue<LeadSource>(
                        filters.sources,
                        source,
                      ),
                    })
                  }
                >
                  {leadSourceLabels[source]}
                </FilterOption>
              ))}
            </FilterGroup>

            <FilterGroup legend="Owner">
              <FilterOption
                checked={filters.owners.includes("UNASSIGNED")}
                onChange={() =>
                  onChange({
                    ...filters,
                    owners: toggleLeadFilterValue(filters.owners, "UNASSIGNED"),
                  })
                }
              >
                Unassigned
              </FilterOption>
            </FilterGroup>

            <div className="lead-filter-actions">
              <button
                type="button"
                disabled={activeCount === 0}
                onClick={() => onChange(initialLeadFilterState)}
              >
                Clear filters
              </button>
              <button type="button" onClick={closeAndRestoreFocus}>
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
    <fieldset className="lead-filter-group">
      <legend>{legend}</legend>
      <div>{children}</div>
    </fieldset>
  );
}

function FilterOption({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className="lead-filter-option">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
  );
}
