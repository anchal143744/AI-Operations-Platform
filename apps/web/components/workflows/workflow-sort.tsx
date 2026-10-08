import {
  workflowSortOptions,
  type WorkflowSortOption,
} from "../../lib/workflows/model";

export function WorkflowSort({
  value,
  onChange,
}: {
  value: WorkflowSortOption;
  onChange: (value: WorkflowSortOption) => void;
}) {
  return (
    <label className="ops-sort">
      <span className="sr-only">Sort workflows</span>
      <select
        value={value}
        onChange={(event) =>
          onChange(event.currentTarget.value as WorkflowSortOption)
        }
      >
        {workflowSortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
