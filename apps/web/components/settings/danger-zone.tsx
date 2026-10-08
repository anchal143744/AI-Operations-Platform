import { Button } from "../ui/primitives";
import { SettingsSection } from "./settings-section";

export function DangerZone() {
  return (
    <SettingsSection
      id="danger-zone"
      eyebrow="Restricted controls"
      title="Danger zone"
      description="Destructive workspace controls remain unavailable until retention policy and a separately secured backend operation are implemented."
      tone="danger"
    >
      <div className="settings-danger-actions">
        <div>
          <strong>Disable workspace</strong>
          <p>Temporarily prevent operational access.</p>
          <Button size="small" variant="outline" disabled>
            Disable workspace
          </Button>
        </div>
        <div>
          <strong>Delete workspace</strong>
          <p>Permanently remove workspace data and configuration.</p>
          <Button size="small" variant="outline" disabled>
            Delete workspace
          </Button>
        </div>
      </div>
      <small>
        No destructive operation can be performed from this frontend preview.
      </small>
    </SettingsSection>
  );
}
