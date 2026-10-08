import type { LeadStatusTotals } from "@aop/types";
import { leadPipelineStates } from "../../lib/leads/model";

export function LeadPipelineSummary({
  totals,
  workspaceReady,
}: {
  /** Undefined is loading; null is an API failure, never an assumed zero. */
  totals: LeadStatusTotals | null | undefined;
  workspaceReady: boolean;
}) {
  const description = !workspaceReady
    ? "Select a workspace to view totals"
    : totals === undefined
      ? "Loading current workspace totals…"
      : totals === null
        ? "Pipeline data is unavailable"
        : "Current workspace totals";
  return (
    <section className="lead-pipeline" aria-labelledby="pipeline-title">
      <div className="lead-section-heading">
        <div>
          <p className="app-kicker">Pipeline</p>
          <h2 id="pipeline-title">Opportunity state</h2>
        </div>
        <p role="status">{description}</p>
      </div>
      <div className="lead-pipeline-grid">
        {leadPipelineStates.map((item) => (
          <article className="lead-pipeline-card" key={item.status}>
            <div>
              <span className="lead-pipeline-dot" aria-hidden="true" />
              <h3>{item.label}</h3>
            </div>
            <strong
              aria-label={`${item.label}: ${totals ? totals[item.status] : description}`}
            >
              {totals ? totals[item.status] : "—"}
            </strong>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
