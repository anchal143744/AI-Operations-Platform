import { activityViews, type ActivityView } from "../../lib/activity/model";

export function ActivityViews({
  value,
  onChange,
}: {
  value: ActivityView;
  onChange: (value: ActivityView) => void;
}) {
  return (
    <div className="ops-views" role="group" aria-label="Activity views">
      {activityViews.map((view) => (
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
