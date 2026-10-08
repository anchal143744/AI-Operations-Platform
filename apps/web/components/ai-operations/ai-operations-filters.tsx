"use client";

import { useEffect, useRef, type KeyboardEvent, type RefObject } from "react";
import {
  aiOperationPriorities,
  aiOperationSourceTypes,
  aiOperationStatuses,
  getActiveAIOperationFilterCount,
  initialAIOperationFilterState,
  toggleAIOperationFilterValue,
  type AIOperationFilterState,
  type AIOperationPriority,
  type AIOperationSourceType,
  type AIOperationStatus,
} from "../../lib/ai-operations/model";
import { leadPriorityLabels } from "../../lib/leads/model";
import { Icon } from "../icons";

const pretty = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());

export function AIOperationsFilters({
  open,
  filters,
  triggerRef,
  onOpen,
  onClose,
  onChange,
}: {
  open: boolean;
  filters: AIOperationFilterState;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
  onClose: () => void;
  onChange: (filters: AIOperationFilterState) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const count = getActiveAIOperationFilterCount(filters);
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => closeRef.current?.focus());
    const previous = document.body.style.overflow;
    const mobile = window.matchMedia("(max-width: 38rem)").matches;
    if (mobile) document.body.style.overflow = "hidden";
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    document.addEventListener("keydown", escape);
    return () => {
      if (mobile) document.body.style.overflow = previous;
      document.removeEventListener("keydown", escape);
    };
  }, [onClose, open, triggerRef]);
  const close = () => {
    onClose();
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const trap = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const nodes = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        "button:not([disabled]),input:not([disabled]),select:not([disabled])",
      ),
    );
    const first = nodes[0],
      last = nodes.at(-1);
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
        aria-controls="ai-filter-panel"
        onClick={open ? close : onOpen}
      >
        <Icon name="sliders" size="small" />
        Filters{count ? <span>{count}</span> : null}
      </button>
      {open ? (
        <div className="ops-filter-layer">
          <button
            type="button"
            tabIndex={-1}
            className="ops-filter-backdrop"
            aria-label="Close AI operation filters"
            onClick={close}
          />
          <div
            className="ops-filter-panel"
            id="ai-filter-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Filter AI operations"
            onKeyDown={trap}
          >
            <div className="ops-filter-heading">
              <div>
                <strong>Filter AI operations</strong>
                <small>No AI data is connected</small>
              </div>
              <button
                type="button"
                ref={closeRef}
                aria-label="Close AI operation filters"
                onClick={close}
              >
                <Icon name="x" size="small" />
              </button>
            </div>
            <FilterGroup legend="Status">
              {aiOperationStatuses.map((status) => (
                <FilterOption
                  key={status}
                  label={pretty(status)}
                  checked={filters.statuses.includes(status)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      statuses: toggleAIOperationFilterValue<AIOperationStatus>(
                        filters.statuses,
                        status,
                      ),
                    })
                  }
                />
              ))}
            </FilterGroup>
            <FilterGroup legend="Priority">
              {aiOperationPriorities.map((priority) => (
                <FilterOption
                  key={priority}
                  label={leadPriorityLabels[priority]}
                  checked={filters.priorities.includes(priority)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      priorities:
                        toggleAIOperationFilterValue<AIOperationPriority>(
                          filters.priorities,
                          priority,
                        ),
                    })
                  }
                />
              ))}
            </FilterGroup>
            <FilterGroup legend="Source">
              {aiOperationSourceTypes.map((source) => (
                <FilterOption
                  key={source}
                  label={pretty(source)}
                  checked={filters.sources.includes(source)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      sources:
                        toggleAIOperationFilterValue<AIOperationSourceType>(
                          filters.sources,
                          source,
                        ),
                    })
                  }
                />
              ))}
            </FilterGroup>
            <label className="ops-select-label">
              <span>Human review</span>
              <select
                value={filters.review}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    review: event.currentTarget
                      .value as AIOperationFilterState["review"],
                  })
                }
              >
                <option value="ALL">Any requirement</option>
                <option value="REQUIRED">Required</option>
                <option value="NOT_REQUIRED">Not required</option>
              </select>
            </label>
            <div className="ops-filter-actions">
              <button
                type="button"
                disabled={!count}
                onClick={() => onChange(initialAIOperationFilterState)}
              >
                Clear filters
              </button>
              <button type="button" onClick={close}>
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
  children: React.ReactNode;
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
