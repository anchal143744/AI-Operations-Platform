import { Icon } from "../icons";

export function ApprovalSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="ops-search">
      <span className="sr-only">Search review requests</span>
      <Icon name="search" size="small" />
      <input
        type="search"
        value={value}
        placeholder="Search review requests"
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear review request search"
          onClick={() => onChange("")}
        >
          <Icon name="x" size="small" />
        </button>
      ) : null}
    </label>
  );
}
