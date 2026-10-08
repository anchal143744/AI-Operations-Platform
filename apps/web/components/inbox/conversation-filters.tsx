"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  conversationAttentionLabels,
  conversationAttentionStates,
  conversationChannelLabels,
  conversationChannels,
  conversationStatusLabels,
  conversationStatuses,
  getActiveConversationFilterCount,
  initialConversationFilterState,
  toggleConversationFilterValue,
  type ConversationAttentionState,
  type ConversationChannel,
  type ConversationFilterState,
  type ConversationStatus,
} from "../../lib/conversations/model";
import { Icon } from "../icons";

export function ConversationFilters({
  open,
  filters,
  triggerRef,
  onOpen,
  onClose,
  onChange,
}: {
  open: boolean;
  filters: ConversationFilterState;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
  onClose: () => void;
  onChange: (filters: ConversationFilterState) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const activeCount = getActiveConversationFilterCount(filters);

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
    <div className="conversation-filter-root">
      <button
        className="conversation-toolbar-control"
        type="button"
        ref={triggerRef}
        aria-expanded={open}
        aria-controls="conversation-filter-panel"
        onClick={open ? closeAndRestoreFocus : onOpen}
      >
        <Icon name="sliders" size="small" />
        Filters
        {activeCount > 0 ? (
          <span
            className="conversation-filter-count"
            aria-label={`${activeCount} active filters`}
          >
            {activeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="conversation-filter-layer">
          <button
            className="conversation-filter-backdrop"
            type="button"
            tabIndex={-1}
            aria-label="Close conversation filters"
            onClick={closeAndRestoreFocus}
          />
          <div
            className="conversation-filter-panel"
            id="conversation-filter-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Filter conversations"
            onKeyDown={keepFocusInside}
          >
            <div className="conversation-filter-heading">
              <div>
                <span>Filter conversations</span>
                <small>No communication data is connected</small>
              </div>
              <button
                type="button"
                ref={closeRef}
                aria-label="Close conversation filters"
                onClick={closeAndRestoreFocus}
              >
                <Icon name="x" size="small" />
              </button>
            </div>

            <ConversationFilterGroup legend="Status">
              {conversationStatuses.map((status) => (
                <ConversationFilterOption
                  key={status}
                  checked={filters.statuses.includes(status)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      statuses:
                        toggleConversationFilterValue<ConversationStatus>(
                          filters.statuses,
                          status,
                        ),
                    })
                  }
                >
                  {conversationStatusLabels[status]}
                </ConversationFilterOption>
              ))}
            </ConversationFilterGroup>

            <ConversationFilterGroup legend="Channel">
              {conversationChannels.map((channel) => (
                <ConversationFilterOption
                  key={channel}
                  checked={filters.channels.includes(channel)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      channels:
                        toggleConversationFilterValue<ConversationChannel>(
                          filters.channels,
                          channel,
                        ),
                    })
                  }
                >
                  {conversationChannelLabels[channel]}
                </ConversationFilterOption>
              ))}
            </ConversationFilterGroup>

            <ConversationFilterGroup legend="Attention">
              {conversationAttentionStates.map((attentionState) => (
                <ConversationFilterOption
                  key={attentionState}
                  checked={filters.attentionStates.includes(attentionState)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      attentionStates:
                        toggleConversationFilterValue<ConversationAttentionState>(
                          filters.attentionStates,
                          attentionState,
                        ),
                    })
                  }
                >
                  {conversationAttentionLabels[attentionState]}
                </ConversationFilterOption>
              ))}
            </ConversationFilterGroup>

            <ConversationFilterGroup legend="Owner">
              <ConversationFilterOption
                checked={filters.owners.includes("UNASSIGNED")}
                onChange={() =>
                  onChange({
                    ...filters,
                    owners: toggleConversationFilterValue(
                      filters.owners,
                      "UNASSIGNED",
                    ),
                  })
                }
              >
                Unassigned
              </ConversationFilterOption>
            </ConversationFilterGroup>

            <div className="conversation-filter-actions">
              <button
                type="button"
                disabled={activeCount === 0}
                onClick={() => onChange(initialConversationFilterState)}
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

function ConversationFilterGroup({
  legend,
  children,
}: {
  legend: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="conversation-filter-group">
      <legend>{legend}</legend>
      <div>{children}</div>
    </fieldset>
  );
}

function ConversationFilterOption({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className="conversation-filter-option">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
  );
}
