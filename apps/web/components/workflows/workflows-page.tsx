import { ButtonLink } from "../ui/primitives";
import { WorkflowRuntimePanel } from "../workflow-control/workflow-runtime-panel";
import {
  AIWorkflowConnection,
  WorkflowActivity,
  WorkflowControlPanel,
  WorkflowSafety,
} from "./workflow-controls";
import { WorkflowBuilderPreview } from "./workflow-builder-preview";

export function WorkflowsPage() {
  return (
    <div className="operations-page workflows-page">
      <header className="ops-page-header">
        <div>
          <p className="app-kicker">Operational automation</p>
          <h1>Workflows</h1>
          <p>
            Design controlled operational workflows that connect business
            events, policy, human review, and actions.
          </p>
        </div>
        <div className="ops-header-actions">
          <ButtonLink href="#controlled-workflows-title" size="small">
            Manage workflows
          </ButtonLink>
        </div>
      </header>
      <WorkflowRuntimePanel />
      <WorkflowBuilderPreview />
      <WorkflowControlPanel />
      <AIWorkflowConnection />
      <div className="workflow-footer-grid">
        <WorkflowSafety />
        <WorkflowActivity />
      </div>
    </div>
  );
}
