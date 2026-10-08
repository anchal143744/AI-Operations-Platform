"use client";

import { useEffect, useRef, type KeyboardEvent, type RefObject } from "react";
import {
  activityActorLabels,
  activityActorTypes,
  activityDateRanges,
  type ActivityActorType,
  type ActivityFilterState,
} from "../../lib/activity/model";
import {
  getActiveActivityFilterCount,
  initialActivityFilterState,
} from "../../lib/activity/state";
import { Icon } from "../icons";

export function ActivityFilters({
  open,
  filters,
  triggerRef,
  onOpen,
  onClose,
  onChange,
}: {
  open: boolean;
  filters: ActivityFilterState;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
  onClose: () => void;
  onChange: (filters: ActivityFilterState) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const count = getActiveActivityFilterCount(filters);

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
        aria-controls="activity-filter-panel"
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
            aria-label="Close activity filters"
            onClick={closeAndRestore}
          />
          <div
            className="ops-filter-panel activity-filter-panel"
            id="activity-filter-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Filter activity"
            onKeyDown={keepFocusInside}
          >
            <div className="ops-filter-heading">
              <div>
                <strong>Filter activity</strong>
                <small>Filters query recorded workspace activity</small>
              </div>
              <button
                type="button"
                ref={closeRef}
                aria-label="Close activity filters"
                onClick={closeAndRestore}
              >
                <Icon name="x" size="small" />
              </button>
            </div>
            <label className="ops-select-label">
              <span>Actor</span>
              <select
                value={filters.actors[0] ?? "ALL"}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    actors:
                      event.target.value === "ALL"
                        ? []
                        : [event.target.value as ActivityActorType],
                  })
                }
              >
                <option value="ALL">All actors</option>
                {activityActorTypes
                  .filter((actor) => actor !== "WORKFLOW")
                  .map((actor) => (
                    <option key={actor} value={actor}>
                      {activityActorLabels[actor]}
                    </option>
                  ))}
              </select>
            </label>
            <label className="ops-select-label">
              <span>Date range</span>
              <select
                value={filters.dateRange}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    dateRange: event.target
                      .value as ActivityFilterState["dateRange"],
                  })
                }
              >
                {activityDateRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="ops-filter-actions">
              <button
                type="button"
                disabled={!count}
                onClick={() => onChange(initialActivityFilterState)}
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
