import { aiOperationSummaryItems } from "../../lib/ai-operations/model";
import { Card } from "../ui/primitives";

export function AIOperationsSummary() {
  return (
    <section className="ops-summary" aria-labelledby="ai-summary-title">
      <h2 className="sr-only" id="ai-summary-title">
        AI operations summary
      </h2>
      {aiOperationSummaryItems.map((item) => (
        <Card className="ops-summary-card" key={item.label}>
          <span>{item.label}</span>
          <strong aria-label={`${item.label}: no data`}>—</strong>
          <small>{item.description}</small>
        </Card>
      ))}
    </section>
  );
}
