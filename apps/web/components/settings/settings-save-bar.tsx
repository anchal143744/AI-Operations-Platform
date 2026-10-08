import { Button } from "../ui/primitives";

export function SettingsSaveBar({
  changed,
  saving,
  onSave,
}: {
  changed: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <aside className="settings-save-bar" aria-label="Settings save status">
      <div>
        <strong>
          {changed
            ? "Unsaved workspace profile"
            : "Workspace profile up to date"}
        </strong>
        <span>
          Only General settings are persisted. Other controls remain previews.
        </span>
      </div>
      <Button size="small" disabled={!changed || saving} onClick={onSave}>
        {saving ? "Saving…" : "Save profile"}
      </Button>
    </aside>
  );
}
