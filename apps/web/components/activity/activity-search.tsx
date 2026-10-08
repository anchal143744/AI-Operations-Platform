import { Icon } from "../icons";

export function ActivitySearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="ops-search">
      <span className="sr-only">Search activity</span>
      <Icon name="search" size="small" />
      <input
        type="search"
        value={value}
        placeholder="Search activity"
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear activity search"
          onClick={() => onChange("")}
        >
          <Icon name="x" size="small" />
        </button>
      ) : null}
    </label>
  );
}
