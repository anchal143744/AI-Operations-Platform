import {
  getAIOperationEmptyState,
  type AIOperation,
  type AIOperationFilterState,
  type AIOperationView,
} from "../../lib/ai-operations/model";
import { Icon } from "../icons";

export function AIOperationList({
  operations,
  query,
  filters,
  view,
}: {
  operations: readonly AIOperation[];
  query: string;
  filters: AIOperationFilterState;
  view: AIOperationView;
}) {
  if (!operations.length) {
    const state = getAIOperationEmptyState(query, filters, view);
    return (
      <div className="ops-empty">
        <span className="ops-empty-mark">
          <Icon name="spark" />
        </span>
        <p className="app-kicker">Queue awaiting connection</p>
        <h3>{state.title}</h3>
        <p>{state.description}</p>
        <small>
          AI proposes · Policy controls · Human reviews · System records
        </small>
      </div>
    );
  }
  return (
    <div className="ops-list" aria-label="AI operations">
      {operations.map((operation) => (
        <AIOperationListItem key={operation.id} operation={operation} />
      ))}
    </div>
  );
}

export function AIOperationListItem({ operation }: { operation: AIOperation }) {
  return (
    <article>
      <strong>{operation.title}</strong>
      <span>{operation.status}</span>
    </article>
  );
}
