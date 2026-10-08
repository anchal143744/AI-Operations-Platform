import { workflowViews, type WorkflowView } from "../../lib/workflows/model";

export function WorkflowViews({
  value,
  onChange,
}: {
  value: WorkflowView;
  onChange: (value: WorkflowView) => void;
}) {
  return (
    <div className="ops-views" role="group" aria-label="Workflow views">
      {workflowViews.map((view) => (
        <button
          key={view.value}
          type="button"
          aria-pressed={value === view.value}
          onClick={() => onChange(view.value)}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
