import {
  followUpSortOptions,
  type FollowUpSortOption,
} from "../../lib/follow-ups/model";
import { Icon } from "../icons";

export function FollowUpSort({
  value,
  onChange,
}: {
  value: FollowUpSortOption;
  onChange: (value: FollowUpSortOption) => void;
}) {
  return (
    <label className="follow-up-sort">
      <span>Sort follow-ups</span>
      <select
        value={value}
        onChange={(event) =>
          onChange(event.currentTarget.value as FollowUpSortOption)
        }
      >
        {followUpSortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" size="small" />
    </label>
  );
}
