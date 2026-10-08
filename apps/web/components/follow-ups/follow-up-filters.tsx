"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  followUpDateFilters,
  followUpPriorities,
  followUpPriorityLabels,
  followUpStatuses,
  followUpStatusLabels,
  followUpTypes,
  followUpTypeLabels,
  getActiveFollowUpFilterCount,
  initialFollowUpFilterState,
  toggleFollowUpFilterValue,
  type FollowUpDateFilter,
  type FollowUpFilterState,
  type FollowUpPriority,
  type FollowUpStatus,
  type FollowUpType,
} from "../../lib/follow-ups/model";
import { Icon } from "../icons";

export function FollowUpFilters({
  open,
  filters,
  triggerRef,
  onOpen,
  onClose,
  onChange,
}: {
  open: boolean;
  filters: FollowUpFilterState;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
  onClose: () => void;
  onChange: (filters: FollowUpFilterState) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const activeCount = getActiveFollowUpFilterCount(filters);

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
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
    <div className="follow-up-filter-root">
      <button
        className="follow-up-toolbar-control"
        type="button"
        ref={triggerRef}
        aria-expanded={open}
        aria-controls="follow-up-filter-panel"
        onClick={open ? closeAndRestoreFocus : onOpen}
      >
        <Icon name="sliders" size="small" />
        Filters
        {activeCount > 0 ? (
          <span
            className="follow-up-filter-count"
            aria-label={`${activeCount} active filters`}
          >
            {activeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="follow-up-filter-layer">
          <button
            className="follow-up-filter-backdrop"
            type="button"
            tabIndex={-1}
            aria-label="Close follow-up filters"
            onClick={closeAndRestoreFocus}
          />
          <div
            className="follow-up-filter-panel"
            id="follow-up-filter-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Filter follow-ups"
            onKeyDown={keepFocusInside}
          >
            <div className="follow-up-filter-heading">
              <div>
                <span>Filter follow-ups</span>
                <small>Filter the selected workspace queue</small>
              </div>
              <button
                type="button"
                ref={closeRef}
                aria-label="Close follow-up filters"
                onClick={closeAndRestoreFocus}
              >
                <Icon name="x" size="small" />
              </button>
            </div>

            <FollowUpFilterGroup legend="Status">
              {followUpStatuses.map((status) => (
                <FollowUpFilterOption
                  key={status}
                  checked={filters.statuses.includes(status)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      statuses: toggleFollowUpFilterValue<FollowUpStatus>(
                        filters.statuses,
                        status,
                      ),
                    })
                  }
                >
                  {followUpStatusLabels[status]}
                </FollowUpFilterOption>
              ))}
            </FollowUpFilterGroup>

            <FollowUpFilterGroup legend="Priority">
              {followUpPriorities.map((priority) => (
                <FollowUpFilterOption
                  key={priority}
                  checked={filters.priorities.includes(priority)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      priorities: toggleFollowUpFilterValue<FollowUpPriority>(
                        filters.priorities,
                        priority,
                      ),
                    })
                  }
                >
                  {followUpPriorityLabels[priority]}
                </FollowUpFilterOption>
              ))}
            </FollowUpFilterGroup>

            <FollowUpFilterGroup legend="Type">
              {followUpTypes.map((type) => (
                <FollowUpFilterOption
                  key={type}
                  checked={filters.types.includes(type)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      types: toggleFollowUpFilterValue<FollowUpType>(
                        filters.types,
                        type,
                      ),
                    })
                  }
                >
                  {followUpTypeLabels[type]}
                </FollowUpFilterOption>
              ))}
            </FollowUpFilterGroup>

            <FollowUpFilterGroup legend="Owner">
              <FollowUpFilterOption
                checked={filters.owners.includes("UNASSIGNED")}
                onChange={() =>
                  onChange({
                    ...filters,
                    owners: toggleFollowUpFilterValue(
                      filters.owners,
                      "UNASSIGNED",
                    ),
                  })
                }
              >
                Unassigned
              </FollowUpFilterOption>
            </FollowUpFilterGroup>

            <label className="follow-up-date-filter">
              <span>Date</span>
              <select
                value={filters.date}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    date: event.currentTarget.value as FollowUpDateFilter,
                  })
                }
              >
                {followUpDateFilters.map((date) => (
                  <option key={date.value} value={date.value}>
                    {date.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="follow-up-filter-actions">
              <button
                type="button"
                disabled={activeCount === 0}
                onClick={() => onChange(initialFollowUpFilterState)}
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

function FollowUpFilterGroup({
  legend,
  children,
}: {
  legend: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="follow-up-filter-group">
      <legend>{legend}</legend>
      <div>{children}</div>
    </fieldset>
  );
}

function FollowUpFilterOption({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className="follow-up-filter-option">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
  );
}
