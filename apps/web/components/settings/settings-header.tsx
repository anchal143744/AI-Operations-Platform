export function SettingsHeader() {
  return (
    <header className="ops-page-header settings-header">
      <div>
        <p className="app-kicker">Workspace control</p>
        <h1>Settings</h1>
        <p>
          Prepare how the workspace, team, AI assistance, approvals, workflows,
          integrations, notifications, and security will be governed.
        </p>
      </div>
      <span className="settings-preview-badge">Profile connected</span>
    </header>
  );
}
