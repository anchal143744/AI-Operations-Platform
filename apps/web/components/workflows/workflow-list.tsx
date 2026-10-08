import {
  getWorkflowEmptyState,
  type Workflow,
  type WorkflowFilterState,
  type WorkflowView,
} from "../../lib/workflows/model";
import { Icon } from "../icons";
import { Button } from "../ui/primitives";

export function WorkflowList({
  workflows,
  query,
  filters,
  view,
  onCreate,
}: {
  workflows: readonly Workflow[];
  query: string;
  filters: WorkflowFilterState;
  view: WorkflowView;
  onCreate: () => void;
}) {
  if (!workflows.length) {
    const state = getWorkflowEmptyState(query, filters, view);
    return (
      <div className="ops-empty">
        <span className="ops-empty-mark">
          <Icon name="workflow" />
        </span>
        <p className="app-kicker">Automation awaiting connection</p>
        <h3>{state.title}</h3>
        <p>{state.description}</p>
        {!query && view === "ALL" ? (
          <Button size="small" onClick={onCreate}>
            Create workflow
          </Button>
        ) : null}
      </div>
    );
  }
  return (
    <div className="ops-list" aria-label="Workflows">
      {workflows.map((workflow) => (
        <WorkflowListItem key={workflow.id} workflow={workflow} />
      ))}
    </div>
  );
}
export function WorkflowListItem({ workflow }: { workflow: Workflow }) {
  return (
    <article>
      <strong>{workflow.name}</strong>
      <span>{workflow.status}</span>
    </article>
  );
}
