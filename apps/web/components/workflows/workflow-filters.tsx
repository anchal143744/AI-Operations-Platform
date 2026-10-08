"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  getActiveWorkflowFilterCount,
  initialWorkflowFilterState,
  toggleWorkflowFilterValue,
  workflowStatuses,
  workflowTriggerTypes,
  type WorkflowFilterState,
  type WorkflowStatus,
  type WorkflowTriggerType,
} from "../../lib/workflows/model";
import { Icon } from "../icons";

const pretty = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());

export function WorkflowFilters({
  open,
  filters,
  triggerRef,
  onOpen,
  onClose,
  onChange,
}: {
  open: boolean;
  filters: WorkflowFilterState;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
  onClose: () => void;
  onChange: (filters: WorkflowFilterState) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const count = getActiveWorkflowFilterCount(filters);
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
        aria-controls="workflow-filter-panel"
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
            aria-label="Close workflow filters"
            onClick={close}
          />
          <div
            className="ops-filter-panel"
            id="workflow-filter-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Filter workflows"
            onKeyDown={trap}
          >
            <div className="ops-filter-heading">
              <div>
                <strong>Filter workflows</strong>
                <small>No automation data is connected</small>
              </div>
              <button
                type="button"
                ref={closeRef}
                aria-label="Close workflow filters"
                onClick={close}
              >
                <Icon name="x" size="small" />
              </button>
            </div>
            <FilterGroup legend="Status">
              {workflowStatuses.map((status) => (
                <FilterOption
                  key={status}
                  label={pretty(status)}
                  checked={filters.statuses.includes(status)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      statuses: toggleWorkflowFilterValue<WorkflowStatus>(
                        filters.statuses,
                        status,
                      ),
                    })
                  }
                />
              ))}
            </FilterGroup>
            <FilterGroup legend="Trigger">
              {workflowTriggerTypes.map((trigger) => (
                <FilterOption
                  key={trigger}
                  label={pretty(trigger)}
                  checked={filters.triggers.includes(trigger)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      triggers: toggleWorkflowFilterValue<WorkflowTriggerType>(
                        filters.triggers,
                        trigger,
                      ),
                    })
                  }
                />
              ))}
            </FilterGroup>
            <FilterGroup legend="Owner">
              <FilterOption
                label="Unassigned"
                checked={filters.owners.includes("UNASSIGNED")}
                onChange={() =>
                  onChange({
                    ...filters,
                    owners: toggleWorkflowFilterValue(
                      filters.owners,
                      "UNASSIGNED",
                    ),
                  })
                }
              />
            </FilterGroup>
            <label className="ops-select-label">
              <span>Requires approval</span>
              <select
                value={filters.approval}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    approval: event.currentTarget
                      .value as WorkflowFilterState["approval"],
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
                onClick={() => onChange(initialWorkflowFilterState)}
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
