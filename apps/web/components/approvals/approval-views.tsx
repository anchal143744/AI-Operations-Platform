import { approvalViews, type ApprovalView } from "../../lib/approvals/model";

export function ApprovalViews({
  value,
  onChange,
}: {
  value: ApprovalView;
  onChange: (value: ApprovalView) => void;
}) {
  return (
    <div className="ops-views" role="group" aria-label="Approval views">
      {approvalViews.map((view) => (
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
