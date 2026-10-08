import { Icon } from "../icons";

export function AIOperationsSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="ops-search">
      <span className="sr-only">Search AI operations</span>
      <Icon name="search" size="small" />
      <input
        type="search"
        value={value}
        placeholder="Search AI operations"
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear AI operations search"
          onClick={() => onChange("")}
        >
          <Icon name="x" size="small" />
        </button>
      ) : null}
    </label>
  );
}
