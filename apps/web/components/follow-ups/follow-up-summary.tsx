import type { FollowUpSummary as FollowUpSummaryData } from "@aop/types";
import { followUpSummaryItems } from "../../lib/follow-ups/model";

export function FollowUpSummary({
  totals,
  workspaceReady,
}: {
  totals: FollowUpSummaryData | null | undefined;
  workspaceReady: boolean;
}) {
  return (
    <section
      className="follow-up-summary"
      aria-labelledby="follow-up-summary-title"
    >
      <div className="follow-up-section-heading">
        <div>
          <p className="app-kicker">Attention overview</p>
          <h2 id="follow-up-summary-title">Queue state</h2>
        </div>
        <p>
          {workspaceReady ? "Current workspace totals" : "Select a workspace"}
        </p>
      </div>
      <div className="follow-up-summary-grid">
        {followUpSummaryItems.map((item) => (
          <article
            className={`follow-up-summary-card follow-up-summary-${item.view.toLowerCase().replace("_", "-")}`}
            key={item.view}
          >
            <div>
              <span aria-hidden="true" />
              <h3>{item.label}</h3>
            </div>
            <strong
              aria-label={`${item.label}: ${totals ? totals[item.view] : totals === null ? "unavailable" : "loading"}`}
            >
              {totals ? totals[item.view] : "—"}
            </strong>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
