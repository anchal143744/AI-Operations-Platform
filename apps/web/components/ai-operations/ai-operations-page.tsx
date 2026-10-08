"use client";

import { useCallback, useState } from "react";
import {
  AI_CONFIGURATION_UNAVAILABLE_MESSAGE,
  emptyAIOperations,
  initialAIOperationFilterState,
  type AIOperationView,
} from "../../lib/ai-operations/model";
import { Icon } from "../icons";
import { AIControlModel } from "./ai-control-model";
import {
  AIActivity,
  AIContextConnections,
  AIHumanReview,
  AIPolicyPanel,
} from "./ai-governance";
import { AIOperationList } from "./ai-operation-list";
import { AIOperationsHeader } from "./ai-operations-header";
import { AIOperationsSummary } from "./ai-operations-summary";
import { AIOperationsToolbar } from "./ai-operations-toolbar";
import { AIOperationsViews } from "./ai-operations-views";

export function AIOperationsPage() {
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(initialAIOperationFilterState);
  const [view, setView] = useState<AIOperationView>("ALL");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);
  return (
    <div className="operations-page ai-operations-page">
      <AIOperationsHeader
        onConfigure={() => setNotice(AI_CONFIGURATION_UNAVAILABLE_MESSAGE)}
      />
      {notice ? (
        <div className="ops-notice" role="status">
          <Icon name="shield-check" size="small" />
          <span>{notice}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setNotice(null)}
          >
            <Icon name="x" size="small" />
          </button>
        </div>
      ) : null}
      <AIOperationsSummary />
      <section className="ops-workspace" aria-labelledby="ai-queue-title">
        <div className="ops-section-heading">
          <div>
            <p className="app-kicker">AI work queue</p>
            <h2 id="ai-queue-title">Proposals, decisions and review</h2>
          </div>
          <span>Engine not connected</span>
        </div>
        <AIOperationsViews value={view} onChange={setView} />
        <AIOperationsToolbar
          query={query}
          filters={filters}
          filtersOpen={filtersOpen}
          onQueryChange={setQuery}
          onFiltersOpen={() => setFiltersOpen(true)}
          onFiltersClose={closeFilters}
          onFiltersChange={setFilters}
        />
        <AIOperationList
          operations={emptyAIOperations}
          query={query}
          filters={filters}
          view={view}
        />
      </section>
      <AIControlModel />
      <div className="ops-governance-grid">
        <AIHumanReview />
        <AIPolicyPanel />
        <AIActivity />
      </div>
      <AIContextConnections />
    </div>
  );
}
