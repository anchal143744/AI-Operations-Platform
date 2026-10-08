import { Icon } from "../icons";

export function LeadSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="lead-search">
      <label htmlFor="lead-search-input">Search leads</label>
      <Icon name="search" size="small" />
      <input
        id="lead-search-input"
        type="search"
        value={value}
        placeholder="Search leads"
        autoComplete="off"
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear lead search"
          onClick={() => onChange("")}
        >
          <Icon name="x" size="small" />
        </button>
      ) : null}
    </div>
  );
}
