import {
  conversationSortOptions,
  type ConversationSortOption,
} from "../../lib/conversations/model";
import { Icon } from "../icons";

export function ConversationSort({
  value,
  onChange,
}: {
  value: ConversationSortOption;
  onChange: (value: ConversationSortOption) => void;
}) {
  return (
    <label className="conversation-sort">
      <span>Sort conversations</span>
      <select
        value={value}
        onChange={(event) =>
          onChange(event.currentTarget.value as ConversationSortOption)
        }
      >
        {conversationSortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" size="small" />
    </label>
  );
}
