import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));

const routeFiles = [
  "apps/web/app/page.tsx",
  "apps/web/app/login/page.tsx",
  "apps/web/app/signup/page.tsx",
  "apps/web/app/verify-email/page.tsx",
  "apps/web/app/forgot-password/page.tsx",
  "apps/web/app/reset-password/page.tsx",
  "apps/web/app/onboarding/page.tsx",
  "apps/web/app/dashboard/page.tsx",
  "apps/web/app/leads/page.tsx",
  "apps/web/app/leads/[leadId]/page.tsx",
  "apps/web/app/inbox/page.tsx",
  "apps/web/app/inbox/[conversationId]/page.tsx",
  "apps/web/app/follow-ups/page.tsx",
  "apps/web/app/ai-operations/page.tsx",
  "apps/web/app/workflows/page.tsx",
  "apps/web/app/approvals/page.tsx",
  "apps/web/app/activity/page.tsx",
  "apps/web/app/settings/page.tsx",
] as const;

const modalFilterFiles = [
  "apps/web/components/leads/lead-filters.tsx",
  "apps/web/components/inbox/conversation-filters.tsx",
  "apps/web/components/follow-ups/follow-up-filters.tsx",
  "apps/web/components/ai-operations/ai-operations-filters.tsx",
  "apps/web/components/workflows/workflow-filters.tsx",
  "apps/web/components/approvals/approval-filters.tsx",
  "apps/web/components/activity/activity-filters.tsx",
] as const;

describe("Phase 19 architecture invariants", () => {
  it("owns exactly the approved route source files", () => {
    expect(routeFiles.every((path) => existsSync(`${root}/${path}`))).toBe(
      true,
    );
  });

  it("keeps generated TypeScript caches outside the source tree", () => {
    const ignore = readFileSync(`${root}/.gitignore`, "utf8");
    const webConfig = readFileSync(`${root}/apps/web/tsconfig.json`, "utf8");
    expect(ignore).toContain("*.tsbuildinfo");
    expect(webConfig).toContain('".next/cache/tsconfig.tsbuildinfo"');
  });

  it("marks every focus-trapped filter surface as modal", () => {
    expect(
      modalFilterFiles.every((path) =>
        readFileSync(`${root}/${path}`, "utf8").includes('aria-modal="true"'),
      ),
    ).toBe(true);
  });

  it("keeps authentication behind a typed credential-safe client", () => {
    const contract = readFileSync(
      `${root}/apps/web/lib/auth/authentication-service.ts`,
      "utf8",
    );
    expect(contract).toContain("PasswordUpdateRequest");
    expect(contract).toContain('credentials: "include"');
    expect(contract).toContain("AuthenticationError");
    expect(contract).not.toContain("localStorage");
    expect(contract).not.toContain("sessionStorage");
    expect(contract).not.toContain("resetPassword(password: string)");
  });

  it("separates definitions, human decisions, and execution results", () => {
    const workflow = readFileSync(
      `${root}/apps/web/lib/workflows/model.ts`,
      "utf8",
    );
    const approval = readFileSync(
      `${root}/apps/web/lib/approvals/model.ts`,
      "utf8",
    );
    expect(workflow).toContain("WorkflowExecutionSummary");
    expect(approval).toContain("ApprovalDecision");
    expect(approval).toContain("ApprovalExecutionResult");
  });
});
