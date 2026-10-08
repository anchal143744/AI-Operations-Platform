import { Icon } from "../icons";

export function FollowUpSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="follow-up-search">
      <label htmlFor="follow-up-search-input">Search follow-ups</label>
      <Icon name="search" size="small" />
      <input
        id="follow-up-search-input"
        type="search"
        value={value}
        placeholder="Search follow-ups"
        autoComplete="off"
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear follow-up search"
          onClick={() => onChange("")}
        >
          <Icon name="x" size="small" />
        </button>
      ) : null}
    </div>
  );
}
