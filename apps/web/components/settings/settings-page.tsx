"use client";

import type { TeamMemberRecord } from "@aop/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  INTEGRATION_UNAVAILABLE_MESSAGE,
  TEAM_INVITE_UNAVAILABLE_MESSAGE,
  initialAISettings,
  initialApprovalPolicies,
  initialNotificationSettings,
  initialWorkflowSettings,
  initialWorkspaceSettings,
  integrations,
  securitySettings,
} from "../../lib/settings/model";
import {
  profileToSettings,
  settingsService,
} from "../../lib/settings/settings-service";
import { useWorkspaceContext } from "../../lib/tenancy/tenancy-service";
import { Icon } from "../icons";
import { AISettings } from "./ai-settings";
import { ApprovalPolicySettings } from "./approval-policy-settings";
import { DangerZone } from "./danger-zone";
import { GeneralSettings } from "./general-settings";
import { IntegrationSettings } from "./integration-settings";
import { NotificationSettings } from "./notification-settings";
import { RolePermissionSettings } from "./role-permission-settings";
import { SecuritySettings } from "./security-settings";
import { SettingsHeader } from "./settings-header";
import { SettingsNavigation } from "./settings-navigation";
import { SettingsSaveBar } from "./settings-save-bar";
import { TeamSettings } from "./team-settings";
import { WorkflowSettings } from "./workflow-settings";

export function SettingsPage() {
  const access = useWorkspaceContext();
  const selected = access.selected;
  const selectedKey = selected
    ? `${selected.organizationId}:${selected.workspaceId}`
    : null;
  const [workspace, setWorkspace] = useState(initialWorkspaceSettings);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [team, setTeam] = useState<readonly TeamMemberRecord[]>([]);
  const [teamKey, setTeamKey] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [ai, setAI] = useState(initialAISettings);
  const [policies, setPolicies] = useState(initialApprovalPolicies);
  const [workflow, setWorkflow] = useState(initialWorkflowSettings);
  const [notifications, setNotifications] = useState(
    initialNotificationSettings,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selected || !selectedKey) return;
    let active = true;
    void settingsService.general(selected).then(
      (profile) => {
        if (!active) return;
        setWorkspace(profileToSettings(profile));
        setLoadedKey(selectedKey);
        setChanged(false);
        setLoadError(null);
      },
      (failure: unknown) => {
        if (!active) return;
        setLoadError(
          failure instanceof Error
            ? failure.message
            : "Could not load workspace profile.",
        );
      },
    );
    void settingsService.team(selected).then(
      (members) => {
        if (active) {
          setTeam(members);
          setTeamKey(selectedKey);
          setTeamError(null);
        }
      },
      (failure: unknown) => {
        if (active) {
          setTeam([]);
          setTeamKey(selectedKey);
          setTeamError(
            failure instanceof Error
              ? failure.message
              : "Could not load team members.",
          );
        }
      },
    );
    return () => {
      active = false;
    };
  }, [selected, selectedKey]);

  const markChanged = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setChanged(true);
  };

  async function saveProfile() {
    if (!selected || loadedKey !== selectedKey || !changed) return;
    setSaving(true);
    try {
      const saved = await settingsService.updateGeneral(selected, workspace);
      setWorkspace(profileToSettings(saved));
      setChanged(false);
      setNotice("Workspace profile saved.");
      access.retry();
    } catch (failure) {
      setNotice(
        failure instanceof Error
          ? failure.message
          : "Could not save workspace profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (access.status !== "ready" || !selected) {
    return (
      <div className="settings-page">
        <SettingsHeader />
        <p className="lead-access-note" role="status">
          {access.status === "loading" ? (
            "Checking workspace access…"
          ) : access.status === "signed-out" ? (
            <>
              Sign in to manage workspace settings.{" "}
              <Link href="/login">Sign in</Link>.
            </>
          ) : access.status === "no-workspace" ? (
            <>
              Set up a workspace first.{" "}
              <Link href="/onboarding">Start setup</Link>.
            </>
          ) : (
            <>
              Workspace access is unavailable.{" "}
              <button type="button" onClick={access.retry}>
                Try again
              </button>
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <SettingsHeader />
      {notice ? (
        <div className="ops-notice" role="status">
          <Icon name="sliders" size="small" />
          <span>{notice}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setNotice(null)}
          >
            <Icon name="x" size="small" />
          </button>
        </div>
      ) : null}
      <div className="settings-layout">
        <SettingsNavigation />
        <div className="settings-content" aria-label="Workspace configuration">
          {loadedKey === selectedKey ? (
            <GeneralSettings
              value={workspace}
              onChange={(value) => markChanged(setWorkspace, value)}
            />
          ) : (
            <p
              className="lead-access-note"
              role={loadError ? "alert" : "status"}
            >
              {loadError ?? "Loading workspace profile…"}{" "}
              {loadError ? (
                <button type="button" onClick={access.retry}>
                  Try again
                </button>
              ) : null}
            </p>
          )}
          <TeamSettings
            members={teamKey === selectedKey ? team : []}
            error={teamKey === selectedKey ? teamError : null}
            loading={teamKey !== selectedKey}
            onInvite={() => setNotice(TEAM_INVITE_UNAVAILABLE_MESSAGE)}
          />
          <RolePermissionSettings />
          <AISettings value={ai} onChange={setAI} disabled />
          <ApprovalPolicySettings
            policies={policies}
            onChange={setPolicies}
            disabled
          />
          <WorkflowSettings value={workflow} onChange={setWorkflow} disabled />
          <IntegrationSettings
            items={integrations}
            onConnect={() => setNotice(INTEGRATION_UNAVAILABLE_MESSAGE)}
          />
          <NotificationSettings
            value={notifications}
            onChange={setNotifications}
            disabled
          />
          <SecuritySettings value={securitySettings} />
          <DangerZone />
        </div>
      </div>
      <SettingsSaveBar
        changed={changed && loadedKey === selectedKey}
        saving={saving}
        onSave={() => void saveProfile()}
      />
    </div>
  );
}
