import { Icon } from "../icons";

export function ConversationSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="conversation-search">
      <label htmlFor="conversation-search-input">Search conversations</label>
      <Icon name="search" size="small" />
      <input
        id="conversation-search-input"
        type="search"
        value={value}
        placeholder="Search conversations"
        autoComplete="off"
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear conversation search"
          onClick={() => onChange("")}
        >
          <Icon name="x" size="small" />
        </button>
      ) : null}
    </div>
  );
}
