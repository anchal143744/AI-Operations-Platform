import type { Integration } from "../../lib/settings/model";
import { Icon } from "../icons";
import { Button, Badge } from "../ui/primitives";
import { SettingsSection } from "./settings-section";

const integrationCopy: Readonly<
  Record<Integration["category"], { label: string; description: string }>
> = {
  COMMUNICATION: {
    label: "Communication",
    description: "Customer messaging channels",
  },
  CRM: { label: "CRM", description: "External customer record systems" },
  EMAIL: {
    label: "Email",
    description: "Inbound and outbound email providers",
  },
  CALENDAR: { label: "Calendar", description: "Meetings and availability" },
  AUTOMATION: {
    label: "Automation",
    description: "External workflow services",
  },
  AI_PROVIDERS: {
    label: "AI providers",
    description: "Controlled model-provider boundary",
  },
};

export function IntegrationSettings({
  items,
  onConnect,
}: {
  items: readonly Integration[];
  onConnect: () => void;
}) {
  return (
    <SettingsSection
      id="integrations"
      eyebrow="Provider boundary"
      title="Integrations"
      description="Future provider connections remain isolated behind explicit workspace configuration."
    >
      <div className="settings-integration-grid">
        {items.map((integration) => {
          const copy = integrationCopy[integration.category];
          return (
            <article key={integration.category}>
              <span className="settings-integration-icon" aria-hidden="true">
                <Icon
                  name={
                    integration.category === "AI_PROVIDERS" ? "spark" : "bolt"
                  }
                />
              </span>
              <div>
                <strong>{copy.label}</strong>
                <p>{copy.description}</p>
                <Badge>{integration.status.replace("_", " ")}</Badge>
              </div>
              <Button variant="outline" size="small" onClick={onConnect}>
                Connect
              </Button>
            </article>
          );
        })}
      </div>
      <p className="settings-boundary-note">
        No provider account, credential, token, or external API is connected.
      </p>
    </SettingsSection>
  );
}
