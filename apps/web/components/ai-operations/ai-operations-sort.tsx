import {
  aiOperationSortOptions,
  type AIOperationSortOption,
} from "../../lib/ai-operations/model";

export function AIOperationsSort({
  value,
  onChange,
}: {
  value: AIOperationSortOption;
  onChange: (value: AIOperationSortOption) => void;
}) {
  return (
    <label className="ops-sort">
      <span className="sr-only">Sort AI operations</span>
      <select
        value={value}
        onChange={(event) =>
          onChange(event.currentTarget.value as AIOperationSortOption)
        }
      >
        {aiOperationSortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
