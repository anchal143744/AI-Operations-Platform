import {
  approvalSortOptions,
  type ApprovalSortOption,
} from "../../lib/approvals/model";

export function ApprovalSort({
  value,
  onChange,
}: {
  value: ApprovalSortOption;
  onChange: (value: ApprovalSortOption) => void;
}) {
  return (
    <label className="ops-sort">
      <span className="sr-only">Sort review requests</span>
      <select
        value={value}
        onChange={(event) =>
          onChange(event.currentTarget.value as ApprovalSortOption)
        }
      >
        {approvalSortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
