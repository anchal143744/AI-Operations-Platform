import { followUpViews, type FollowUpView } from "../../lib/follow-ups/model";

export function FollowUpViews({
  value,
  onChange,
}: {
  value: FollowUpView;
  onChange: (view: FollowUpView) => void;
}) {
  return (
    <div
      className="follow-up-views"
      role="tablist"
      aria-label="Follow-up views"
    >
      {followUpViews.map((view) => {
        const active = value === view.value;
        return (
          <button
            key={view.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(view.value)}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}
