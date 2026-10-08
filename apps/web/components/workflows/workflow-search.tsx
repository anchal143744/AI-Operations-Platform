import { Icon } from "../icons";

export function WorkflowSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="ops-search">
      <span className="sr-only">Search workflows</span>
      <Icon name="search" size="small" />
      <input
        type="search"
        value={value}
        placeholder="Search workflows"
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear workflow search"
          onClick={() => onChange("")}
        >
          <Icon name="x" size="small" />
        </button>
      ) : null}
    </label>
  );
}
