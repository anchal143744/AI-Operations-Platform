import type { ReactNode } from "react";
import type { SettingsSectionId } from "../../lib/settings/model";
import { Card } from "../ui/primitives";

export function SettingsSection({
  id,
  eyebrow,
  title,
  description,
  children,
  tone,
}: {
  id: SettingsSectionId;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  tone?: "danger";
}) {
  return (
    <Card
      className={`settings-section${tone ? ` settings-section-${tone}` : ""}`}
    >
      <section id={id} aria-labelledby={`${id}-title`}>
        <header>
          <p className="app-kicker">{eyebrow}</p>
          <h2 id={`${id}-title`}>{title}</h2>
          <p>{description}</p>
        </header>
        <div className="settings-section-content">{children}</div>
      </section>
    </Card>
  );
}
