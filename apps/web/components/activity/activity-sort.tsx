import {
  activitySortOptions,
  type ActivitySortOption,
} from "../../lib/activity/model";

export function ActivitySort({
  value,
  onChange,
}: {
  value: ActivitySortOption;
  onChange: (value: ActivitySortOption) => void;
}) {
  return (
    <label className="ops-sort">
      <span className="sr-only">Sort activity</span>
      <select
        value={value}
        aria-label="Sort activity"
        onChange={(event) => onChange(event.target.value as ActivitySortOption)}
      >
        {activitySortOptions
          .filter(
            (option) => option.value === "NEWEST" || option.value === "OLDEST",
          )
          .map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
      </select>
    </label>
  );
}
