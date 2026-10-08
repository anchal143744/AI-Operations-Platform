import {
  aiOperationViews,
  type AIOperationView,
} from "../../lib/ai-operations/model";

export function AIOperationsViews({
  value,
  onChange,
}: {
  value: AIOperationView;
  onChange: (value: AIOperationView) => void;
}) {
  return (
    <div className="ops-views" role="group" aria-label="AI operation views">
      {aiOperationViews.map((view) => (
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
