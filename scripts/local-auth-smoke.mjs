import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import process from "node:process";
import { URL } from "node:url";
import { PrismaClient } from "@prisma/client";

const baseUrl = new URL(process.env.DATABASE_URL ?? "");
if (
  !["localhost", "127.0.0.1"].includes(baseUrl.hostname) ||
  baseUrl.pathname !== "/ai_operations"
) {
  throw new Error("Auth smoke requires the local ai_operations database.");
}

const schema = `aop_auth_smoke_test_${randomBytes(6).toString("hex")}`;
const isolatedUrl = new URL(baseUrl);
isolatedUrl.searchParams.set("schema", schema);
const admin = new PrismaClient();
let api;
let worker;
let created = false;
let startupStderr = "";

function stopWorkerProcess(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const timeout = globalThis.setTimeout(() => {
      child.kill("SIGKILL");
      resolve(false);
    }, 15_000);
    child.once("exit", () => {
      globalThis.clearTimeout(timeout);
      resolve(true);
    });
    if (child.connected) child.send({ type: "shutdown" });
    else child.kill("SIGTERM");
  });
}

function assertStatus(response, expected, step) {
  if (response.status !== expected) {
    throw new Error(
      `${step} returned ${response.status}, expected ${expected}.`,
    );
  }
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port.");
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

async function waitForReady(origin) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (api.exitCode !== null) break;
    try {
      const response = await globalThis.fetch(`${origin}/health/ready`, {
        signal: globalThis.AbortSignal.timeout(1000),
      });
      if (response.ok) return;
    } catch {
      // Nest is still starting.
    }
    await new Promise((resolve) => globalThis.setTimeout(resolve, 250));
  }
  throw new Error(
    `Isolated API did not become ready (exit ${api.exitCode ?? "pending"}). ${startupStderr.slice(0, 1200).replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL]")}`,
  );
}

async function post(
  origin,
  path,
  body,
  cookie,
  requestOrigin = "http://localhost:3000",
  extraHeaders = {},
) {
  return globalThis.fetch(`${origin}${path}`, {
    method: "POST",
    headers: {
      Origin: requestOrigin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

function cookieFrom(response, name) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .reverse()
    .find((value) => value.startsWith(`${name}=`));
}

try {
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  created = true;
  const migration = spawnSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "migrate",
      "deploy",
      "--schema",
      "database/schema.prisma",
    ],
    {
      env: { ...process.env, DATABASE_URL: isolatedUrl.toString() },
      encoding: "utf8",
    },
  );
  if (migration.status !== 0) {
    throw new Error("Existing migrations failed in the isolated test schema.");
  }

  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  api = spawn(process.execPath, ["apps/api/dist/main.js"], {
    env: {
      ...process.env,
      DATABASE_URL: isolatedUrl.toString(),
      API_PORT: String(port),
      NODE_ENV: "development",
      AUTH_EMAIL_TRANSPORT: "development",
      APP_ORIGIN: "http://localhost:3000",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });
  api.stderr?.on("data", (chunk) => {
    startupStderr += String(chunk);
  });
  await waitForReady(origin);

  const email = `aop-local-smoke-${randomBytes(8).toString("hex")}@example.invalid`;
  const password = `${randomBytes(12).toString("hex")}Aa1`;
  const registration = await post(origin, "/auth/register", {
    firstName: "Local",
    lastName: "Smoke",
    email,
    password,
  });
  assertStatus(registration, 202, "Registration");
  const registered = await registration.json();
  if (!/^\d{6}$/.test(registered.localDevelopmentCode ?? "")) {
    throw new Error("Local-only verification code was not returned.");
  }
  const verificationCookie = cookieFrom(registration, "aop_verification");
  if (!verificationCookie) throw new Error("Verification cookie was not set.");

  const crossOrigin = await post(
    origin,
    "/auth/verify-email",
    { code: registered.localDevelopmentCode },
    verificationCookie,
    "http://untrusted.example.invalid",
  );
  assertStatus(crossOrigin, 403, "Cross-origin rejection");

  const verification = await post(
    origin,
    "/auth/verify-email",
    { code: registered.localDevelopmentCode },
    verificationCookie,
  );
  if (verification.status !== 200) {
    const problem = await verification.json();
    throw new Error(
      `Verification returned ${verification.status} (${problem.code ?? "unknown"}).`,
    );
  }
  const sessionCookie = cookieFrom(verification, "aop_session");
  if (!sessionCookie) throw new Error("Session cookie was not set.");

  const session = await globalThis.fetch(`${origin}/auth/session`, {
    headers: { Cookie: sessionCookie },
  });
  assertStatus(session, 200, "Session lookup");
  const sessionBody = await session.json();
  if (sessionBody.user.email !== email || "passwordHash" in sessionBody.user) {
    throw new Error("Session projection was incorrect.");
  }

  const organizationSlug = `aop-smoke-${randomBytes(6).toString("hex")}`;
  const bootstrap = await post(
    origin,
    "/organizations",
    {
      name: "Local Smoke Test",
      slug: organizationSlug,
      workspaceName: "Local Smoke Operations",
      workspaceSlug: `${organizationSlug}-operations`,
      profile: {
        website: "https://example.com",
        industry: "software",
        companySize: "11–50",
        timezone: "Asia/Kolkata",
        responseExpectation: "1-hour",
      },
    },
    sessionCookie,
  );
  assertStatus(bootstrap, 201, "Workspace bootstrap");
  const bootstrapped = await bootstrap.json();
  const afterBootstrap = await globalThis.fetch(`${origin}/auth/session`, {
    headers: { Cookie: sessionCookie },
  });
  assertStatus(afterBootstrap, 200, "Session after workspace bootstrap");
  const workspaceSession = await afterBootstrap.json();
  if (
    !workspaceSession.workspaceAccess.some(
      (access) =>
        access.organizationId === bootstrapped.organization.id &&
        access.role === "OWNER" &&
        access.workspaceIds.includes(bootstrapped.workspace.id),
    )
  ) {
    throw new Error("New workspace was not available through the session.");
  }

  const tenantHeaders = {
    "X-AOP-Organization-Id": bootstrapped.organization.id,
    "X-AOP-Workspace-Id": bootstrapped.workspace.id,
  };
  const leadResponse = await post(
    origin,
    "/leads",
    { name: "Synthetic Test Lead", source: "MANUAL" },
    sessionCookie,
    "http://localhost:3000",
    tenantHeaders,
  );
  assertStatus(leadResponse, 201, "Tenant-scoped lead creation");
  const lead = await leadResponse.json();
  const leadList = await globalThis.fetch(`${origin}/leads?page=1&limit=1`, {
    headers: { Cookie: sessionCookie, ...tenantHeaders },
  });
  assertStatus(leadList, 200, "Tenant-scoped lead list");
  if ((await leadList.json()).total !== 1) {
    throw new Error("The created lead was not returned in its workspace.");
  }
  const leadSummary = await globalThis.fetch(`${origin}/leads/summary`, {
    headers: { Cookie: sessionCookie, ...tenantHeaders },
  });
  assertStatus(leadSummary, 200, "Tenant-scoped pipeline summary");
  if ((await leadSummary.json()).NEW !== 1) {
    throw new Error("The lead pipeline did not reflect its actual records.");
  }

  const conversationResponse = await post(
    origin,
    "/conversations",
    {
      participantName: "Synthetic Test Contact",
      channel: "WEBSITE",
      leadId: lead.id,
    },
    sessionCookie,
    "http://localhost:3000",
    tenantHeaders,
  );
  assertStatus(
    conversationResponse,
    201,
    "Tenant-scoped conversation creation",
  );
  const conversationList = await globalThis.fetch(
    `${origin}/conversations?page=1&limit=1`,
    { headers: { Cookie: sessionCookie, ...tenantHeaders } },
  );
  assertStatus(conversationList, 200, "Tenant-scoped conversation list");
  if ((await conversationList.json()).total !== 1) {
    throw new Error(
      "The created conversation was not returned in its workspace.",
    );
  }

  const conversation = await conversationResponse.json();
  const dueAt = new Date(Date.now() + 7 * 86400000).toISOString();
  const followUpResponse = await post(
    origin,
    "/follow-ups",
    {
      title: "Synthetic test follow-up",
      type: "CALL",
      priority: "MEDIUM",
      dueAt,
      leadId: lead.id,
      conversationId: conversation.id,
    },
    sessionCookie,
    "http://localhost:3000",
    tenantHeaders,
  );
  assertStatus(followUpResponse, 201, "Tenant-scoped follow-up creation");
  const followUp = await followUpResponse.json();
  if (
    followUp.leadId !== lead.id ||
    followUp.conversationId !== conversation.id
  ) {
    throw new Error("Follow-up relationships were not preserved.");
  }
  const followUpList = await globalThis.fetch(
    `${origin}/follow-ups?view=UPCOMING`,
    {
      headers: { Cookie: sessionCookie, ...tenantHeaders },
    },
  );
  assertStatus(followUpList, 200, "Tenant-scoped follow-up list");
  if ((await followUpList.json()).total !== 1) {
    throw new Error(
      "The scheduled follow-up was not returned in its workspace.",
    );
  }
  const followUpSummary = await globalThis.fetch(
    `${origin}/follow-ups/summary`,
    {
      headers: { Cookie: sessionCookie, ...tenantHeaders },
    },
  );
  assertStatus(followUpSummary, 200, "Tenant-scoped follow-up summary");
  if ((await followUpSummary.json()).UPCOMING !== 1) {
    throw new Error("Follow-up summary did not reflect the scheduled action.");
  }
  const rescheduled = await globalThis.fetch(
    `${origin}/follow-ups/${followUp.id}/reschedule`,
    {
      method: "PATCH",
      headers: {
        Origin: "http://localhost:3000",
        Cookie: sessionCookie,
        "Content-Type": "application/json",
        ...tenantHeaders,
      },
      body: JSON.stringify({
        dueAt: new Date(Date.now() + 8 * 86400000).toISOString(),
      }),
    },
  );
  assertStatus(rescheduled, 200, "Tenant-scoped follow-up reschedule");
  const completed = await globalThis.fetch(
    `${origin}/follow-ups/${followUp.id}/complete`,
    {
      method: "PATCH",
      headers: {
        Origin: "http://localhost:3000",
        Cookie: sessionCookie,
        ...tenantHeaders,
      },
    },
  );
  assertStatus(completed, 200, "Tenant-scoped follow-up completion");
  if ((await completed.json()).status !== "COMPLETED") {
    throw new Error("The follow-up was not marked complete.");
  }
  const completedSummary = await globalThis.fetch(
    `${origin}/follow-ups/summary`,
    {
      headers: { Cookie: sessionCookie, ...tenantHeaders },
    },
  );
  assertStatus(completedSummary, 200, "Completed follow-up summary");
  if ((await completedSummary.json()).COMPLETED !== 1) {
    throw new Error("Completed follow-up count did not update.");
  }
  const secondWorkspaceResponse = await post(
    origin,
    `/organizations/${bootstrapped.organization.id}/workspaces`,
    { name: "Isolated second workspace", slug: `${organizationSlug}-second` },
    sessionCookie,
  );
  assertStatus(secondWorkspaceResponse, 201, "Second workspace creation");
  const secondWorkspace = await secondWorkspaceResponse.json();
  const otherWorkspaceHeaders = {
    "X-AOP-Organization-Id": bootstrapped.organization.id,
    "X-AOP-Workspace-Id": secondWorkspace.id,
  };
  const isolatedList = await globalThis.fetch(`${origin}/follow-ups`, {
    headers: { Cookie: sessionCookie, ...otherWorkspaceHeaders },
  });
  assertStatus(isolatedList, 200, "Second workspace follow-up list");
  if ((await isolatedList.json()).total !== 0) {
    throw new Error("Follow-ups leaked across workspaces.");
  }
  const crossWorkspaceComplete = await globalThis.fetch(
    `${origin}/follow-ups/${followUp.id}/complete`,
    {
      method: "PATCH",
      headers: {
        Origin: "http://localhost:3000",
        Cookie: sessionCookie,
        ...otherWorkspaceHeaders,
      },
    },
  );
  assertStatus(
    crossWorkspaceComplete,
    404,
    "Cross-workspace follow-up mutation",
  );
  const crossWorkspaceLead = await post(
    origin,
    "/follow-ups",
    {
      title: "Invalid cross-workspace reference",
      type: "TASK",
      priority: "LOW",
      dueAt,
      leadId: lead.id,
    },
    sessionCookie,
    "http://localhost:3000",
    otherWorkspaceHeaders,
  );
  assertStatus(crossWorkspaceLead, 404, "Cross-workspace lead reference");
  const anonymousFollowUps = await globalThis.fetch(`${origin}/follow-ups`, {
    headers: tenantHeaders,
  });
  assertStatus(anonymousFollowUps, 401, "Anonymous follow-up list");

  const originalProfile = await globalThis.fetch(`${origin}/settings/general`, {
    headers: { Cookie: sessionCookie, ...tenantHeaders },
  });
  assertStatus(originalProfile, 200, "Tenant-scoped workspace profile");
  const originalProfileData = await originalProfile.json();
  if (
    originalProfileData.workspaceName !== "Local Smoke Operations" ||
    originalProfileData.website !== "https://example.com" ||
    originalProfileData.industry !== "software" ||
    originalProfileData.companySize !== "11–50" ||
    originalProfileData.timezone !== "Asia/Kolkata" ||
    originalProfileData.responseExpectation !== "1-hour"
  ) {
    throw new Error("Onboarding workspace profile was not persisted.");
  }
  const updatedProfile = await globalThis.fetch(`${origin}/settings/general`, {
    method: "PATCH",
    headers: {
      Origin: "http://localhost:3000",
      Cookie: sessionCookie,
      "Content-Type": "application/json",
      ...tenantHeaders,
    },
    body: JSON.stringify({
      workspaceName: "Updated Smoke Operations",
      website: "",
      industry: "software",
      companySize: "11–50",
      timezone: "Asia/Kolkata",
      responseExpectation: "1-hour",
    }),
  });
  assertStatus(updatedProfile, 200, "Tenant-scoped workspace profile update");
  if ((await updatedProfile.json()).industry !== "software") {
    throw new Error("Workspace profile update was not persisted.");
  }
  const reloadedProfile = await globalThis.fetch(`${origin}/settings/general`, {
    headers: { Cookie: sessionCookie, ...tenantHeaders },
  });
  assertStatus(reloadedProfile, 200, "Reloaded workspace profile");
  if (
    (await reloadedProfile.json()).workspaceName !== "Updated Smoke Operations"
  ) {
    throw new Error("Workspace profile update was not retained.");
  }
  const team = await globalThis.fetch(`${origin}/settings/team`, {
    headers: { Cookie: sessionCookie, ...tenantHeaders },
  });
  assertStatus(team, 200, "Tenant-scoped organization membership list");
  if (!(await team.json()).some((member) => member.role === "OWNER")) {
    throw new Error("Real organization membership was not returned.");
  }
  const otherProfile = await globalThis.fetch(`${origin}/settings/general`, {
    headers: { Cookie: sessionCookie, ...otherWorkspaceHeaders },
  });
  assertStatus(otherProfile, 200, "Second workspace profile");
  if (
    (await otherProfile.json()).workspaceName !== "Isolated second workspace"
  ) {
    throw new Error("Workspace profile leaked across workspaces.");
  }

  const workflowResponse = await post(
    origin,
    "/workflows",
    { name: "Isolated dry-run workflow" },
    sessionCookie,
    "http://localhost:3000",
    tenantHeaders,
  );
  assertStatus(workflowResponse, 201, "Workflow creation");
  const workflow = await workflowResponse.json();
  if (
    workflow.status !== "DRAFT" ||
    workflow.policy?.mode !== "REQUIRE_APPROVAL"
  ) {
    throw new Error("New workflow did not default to draft and human review.");
  }
  const workflowSummary = await globalThis.fetch(
    `${origin}/workflows/summary`,
    { headers: { Cookie: sessionCookie, ...tenantHeaders } },
  );
  assertStatus(workflowSummary, 200, "Workflow summary");
  if ((await workflowSummary.json()).workflows !== 1) {
    throw new Error("Workflow summary did not count persisted definitions.");
  }
  const initialVersions = await globalThis.fetch(
    `${origin}/workflows/${workflow.id}/versions`,
    { headers: { Cookie: sessionCookie, ...tenantHeaders } },
  );
  assertStatus(initialVersions, 200, "Workflow version history");
  if ((await initialVersions.json())[0]?.version !== 1) {
    throw new Error("Initial immutable definition version is missing.");
  }
  const editedDraft = await globalThis.fetch(
    `${origin}/workflows/${workflow.id}/definition`,
    {
      method: "PATCH",
      headers: {
        Origin: "http://localhost:3000",
        Cookie: sessionCookie,
        "Content-Type": "application/json",
        ...tenantHeaders,
      },
      body: JSON.stringify({
        name: "Reviewed dry-run workflow",
        description: "Synthetic internal smoke definition",
      }),
    },
  );
  assertStatus(editedDraft, 200, "Draft definition edit");
  if ((await editedDraft.json()).currentVersion !== 2) {
    throw new Error("Draft edit did not create a new definition version.");
  }
  const isolatedWorkflows = await globalThis.fetch(`${origin}/workflows`, {
    headers: { Cookie: sessionCookie, ...otherWorkspaceHeaders },
  });
  assertStatus(isolatedWorkflows, 200, "Other workspace workflows");
  if ((await isolatedWorkflows.json()).length !== 0) {
    throw new Error("Workflow definitions leaked across workspaces.");
  }
  const crossWorkflow = await globalThis.fetch(
    `${origin}/workflows/${workflow.id}`,
    {
      headers: { Cookie: sessionCookie, ...otherWorkspaceHeaders },
    },
  );
  assertStatus(crossWorkflow, 404, "Cross-workspace workflow detail");
  const crossVersions = await globalThis.fetch(
    `${origin}/workflows/${workflow.id}/versions`,
    { headers: { Cookie: sessionCookie, ...otherWorkspaceHeaders } },
  );
  assertStatus(crossVersions, 404, "Cross-workspace version history");
  const forgedWorkflow = await post(
    origin,
    "/workflows",
    { name: "Forged", role: "OWNER" },
    sessionCookie,
    "http://localhost:3000",
    tenantHeaders,
  );
  assertStatus(forgedWorkflow, 400, "Forged workflow role");
  const anonymousWorkflows = await globalThis.fetch(`${origin}/workflows`, {
    headers: tenantHeaders,
  });
  assertStatus(anonymousWorkflows, 401, "Anonymous workflow list");
  const activateWorkflow = await globalThis.fetch(
    `${origin}/workflows/${workflow.id}/status`,
    {
      method: "PATCH",
      headers: {
        Origin: "http://localhost:3000",
        Cookie: sessionCookie,
        "Content-Type": "application/json",
        ...tenantHeaders,
      },
      body: JSON.stringify({ status: "ACTIVE" }),
    },
  );
  assertStatus(activateWorkflow, 200, "Workflow activation");
  const pausedWorkflow = await globalThis.fetch(
    `${origin}/workflows/${workflow.id}/status`,
    {
      method: "PATCH",
      headers: {
        Origin: "http://localhost:3000",
        Cookie: sessionCookie,
        "Content-Type": "application/json",
        ...tenantHeaders,
      },
      body: JSON.stringify({ status: "PAUSED" }),
    },
  );
  assertStatus(pausedWorkflow, 200, "Workflow pause");
  const resumeWorkflow = await globalThis.fetch(
    `${origin}/workflows/${workflow.id}/status`,
    {
      method: "PATCH",
      headers: {
        Origin: "http://localhost:3000",
        Cookie: sessionCookie,
        "Content-Type": "application/json",
        ...tenantHeaders,
      },
      body: JSON.stringify({ status: "ACTIVE" }),
    },
  );
  assertStatus(resumeWorkflow, 200, "Workflow reactivation");
  const invalidTransition = await globalThis.fetch(
    `${origin}/workflows/${workflow.id}/status`,
    {
      method: "PATCH",
      headers: {
        Origin: "http://localhost:3000",
        Cookie: sessionCookie,
        "Content-Type": "application/json",
        ...tenantHeaders,
      },
      body: JSON.stringify({ status: "DRAFT" }),
    },
  );
  assertStatus(invalidTransition, 409, "Invalid workflow transition");
  const key = `smoke_${randomBytes(12).toString("hex")}`;
  const executionResponse = await post(
    origin,
    `/workflows/${workflow.id}/executions`,
    { idempotencyKey: key },
    sessionCookie,
    "http://localhost:3000",
    tenantHeaders,
  );
  assertStatus(executionResponse, 201, "Approval-gated dry run");
  const execution = await executionResponse.json();
  if (execution.status !== "WAITING_FOR_APPROVAL") {
    throw new Error("Approval policy did not gate the dry run.");
  }
  const duplicateExecution = await post(
    origin,
    `/workflows/${workflow.id}/executions`,
    { idempotencyKey: key },
    sessionCookie,
    "http://localhost:3000",
    tenantHeaders,
  );
  assertStatus(duplicateExecution, 201, "Idempotent dry run request");
  if ((await duplicateExecution.json()).id !== execution.id) {
    throw new Error("Duplicate idempotency key created a second execution.");
  }
  const approvals = await globalThis.fetch(`${origin}/approvals`, {
    headers: { Cookie: sessionCookie, ...tenantHeaders },
  });
  assertStatus(approvals, 200, "Approval queue");
  const approval = (await approvals.json())[0];
  if (approval?.workflowExecutionId !== execution.id) {
    throw new Error(
      "The requested dry run did not create an approval request.",
    );
  }
  if (
    approval.workflowExecution?.definitionVersion?.version !== 2 ||
    approval.workflowExecution?.evaluation?.result !== "APPROVAL_REQUIRED"
  ) {
    throw new Error(
      "Approval detail did not expose its pinned version and policy result.",
    );
  }
  const approvalSummary = await globalThis.fetch(
    `${origin}/approvals/summary`,
    { headers: { Cookie: sessionCookie, ...tenantHeaders } },
  );
  assertStatus(approvalSummary, 200, "Approval summary");
  if ((await approvalSummary.json()).pending !== 1) {
    throw new Error("Approval summary did not count the pending review.");
  }
  const isolatedApprovals = await globalThis.fetch(`${origin}/approvals`, {
    headers: { Cookie: sessionCookie, ...otherWorkspaceHeaders },
  });
  assertStatus(isolatedApprovals, 200, "Other workspace approvals");
  if ((await isolatedApprovals.json()).length !== 0) {
    throw new Error("Approval requests leaked across workspaces.");
  }
  const viewerEmail = `aop-viewer-${randomBytes(8).toString("hex")}@example.invalid`;
  const viewerRegistration = await post(origin, "/auth/register", {
    firstName: "Synthetic",
    lastName: "Viewer",
    email: viewerEmail,
    password: `${randomBytes(12).toString("hex")}Aa1`,
  });
  assertStatus(viewerRegistration, 202, "Viewer registration");
  const viewerCode = (await viewerRegistration.json()).localDevelopmentCode;
  const viewerVerification = await post(
    origin,
    "/auth/verify-email",
    { code: viewerCode },
    cookieFrom(viewerRegistration, "aop_verification"),
  );
  assertStatus(viewerVerification, 200, "Viewer verification");
  const viewerCookie = cookieFrom(viewerVerification, "aop_session");
  const viewerPrisma = new PrismaClient({
    datasourceUrl: isolatedUrl.toString(),
  });
  try {
    const viewer = await viewerPrisma.user.findUniqueOrThrow({
      where: { normalizedEmail: viewerEmail },
    });
    await viewerPrisma.membership.create({
      data: {
        userId: viewer.id,
        organizationId: bootstrapped.organization.id,
        role: "VIEWER",
        status: "ACTIVE",
      },
    });
  } finally {
    await viewerPrisma.$disconnect();
  }
  const viewerRead = await globalThis.fetch(`${origin}/workflows`, {
    headers: { Cookie: viewerCookie, ...tenantHeaders },
  });
  assertStatus(viewerRead, 200, "Viewer workflow read");
  const viewerCreate = await post(
    origin,
    "/workflows",
    { name: "Forbidden workflow" },
    viewerCookie,
    "http://localhost:3000",
    tenantHeaders,
  );
  assertStatus(viewerCreate, 403, "Viewer workflow create denied");
  const viewerDecision = await post(
    origin,
    `/approvals/${approval.id}/decisions`,
    { decision: "APPROVED" },
    viewerCookie,
    "http://localhost:3000",
    tenantHeaders,
  );
  assertStatus(viewerDecision, 403, "Viewer approval denied");
  const approve = await post(
    origin,
    `/approvals/${approval.id}/decisions`,
    { decision: "APPROVED" },
    sessionCookie,
    "http://localhost:3000",
    tenantHeaders,
  );
  assertStatus(approve, 201, "Human approval");
  const duplicateDecision = await post(
    origin,
    `/approvals/${approval.id}/decisions`,
    { decision: "APPROVED" },
    sessionCookie,
    "http://localhost:3000",
    tenantHeaders,
  );
  assertStatus(duplicateDecision, 409, "Duplicate approval decision");
  const crossWorkspaceDecision = await post(
    origin,
    `/approvals/${approval.id}/decisions`,
    { decision: "REJECTED" },
    sessionCookie,
    "http://localhost:3000",
    otherWorkspaceHeaders,
  );
  assertStatus(
    crossWorkspaceDecision,
    404,
    "Cross-workspace approval decision",
  );
  const blockPolicy = await globalThis.fetch(
    `${origin}/workflows/${workflow.id}/policy`,
    {
      method: "PATCH",
      headers: {
        Origin: "http://localhost:3000",
        Cookie: sessionCookie,
        "Content-Type": "application/json",
        ...tenantHeaders,
      },
      body: JSON.stringify({ mode: "BLOCK" }),
    },
  );
  assertStatus(blockPolicy, 200, "Block policy update");
  const updatedVersions = await globalThis.fetch(
    `${origin}/workflows/${workflow.id}/versions`,
    { headers: { Cookie: sessionCookie, ...tenantHeaders } },
  );
  assertStatus(updatedVersions, 200, "Updated version history");
  const versionItems = await updatedVersions.json();
  if (
    versionItems[0]?.version !== 3 ||
    versionItems[0]?.policyMode !== "BLOCK" ||
    versionItems[1]?.policyMode !== "REQUIRE_APPROVAL" ||
    versionItems[2]?.name !== "Isolated dry-run workflow"
  ) {
    throw new Error(
      "Policy update did not preserve the previous immutable version.",
    );
  }
  const blockedRun = await post(
    origin,
    `/workflows/${workflow.id}/executions`,
    { idempotencyKey: `blocked_${randomBytes(12).toString("hex")}` },
    sessionCookie,
    "http://localhost:3000",
    tenantHeaders,
  );
  assertStatus(blockedRun, 201, "Blocked dry run request");
  if ((await blockedRun.json()).status !== "CANCELLED") {
    throw new Error("Block policy did not cancel the dry run.");
  }
  const isolatedPrisma = new PrismaClient({
    datasourceUrl: isolatedUrl.toString(),
  });
  try {
    const persisted = await isolatedPrisma.workflowExecution.findFirstOrThrow({
      where: {
        id: execution.id,
        organizationId: bootstrapped.organization.id,
        workspaceId: bootstrapped.workspace.id,
      },
      include: { evaluation: true, approval: true, outboxEvents: true },
    });
    if (
      persisted.evaluation?.result !== "APPROVAL_REQUIRED" ||
      persisted.approval?.status !== "APPROVED" ||
      persisted.outboxEvents.length !== 1
    ) {
      throw new Error(
        "Policy, approval, or transactional outbox was not persisted.",
      );
    }
    let crossTenantForeignKeyRejected = false;
    try {
      await isolatedPrisma.workflowExecution.create({
        data: {
          organizationId: bootstrapped.organization.id,
          workspaceId: secondWorkspace.id,
          workflowId: workflow.id,
          idempotencyKey: `forged_${randomBytes(12).toString("hex")}`,
        },
      });
    } catch (error) {
      crossTenantForeignKeyRejected = error?.code === "P2003";
    }
    if (!crossTenantForeignKeyRejected) {
      throw new Error(
        "Composite workflow foreign key did not reject cross-workspace execution.",
      );
    }
    const events = await isolatedPrisma.activityEvent.findMany({
      where: {
        organizationId: bootstrapped.organization.id,
        workspaceId: bootstrapped.workspace.id,
        resourceId: execution.id,
      },
    });
    if (!events.some((event) => event.eventType === "POLICY_EVALUATED")) {
      throw new Error("Policy evaluation was not audited.");
    }
    for (const action of [
      "workflow.execution_requested",
      "workflow.execution_after_review",
    ]) {
      if (!events.some((event) => event.action === action)) {
        throw new Error(`Missing execution audit transition: ${action}.`);
      }
    }
    const expiringWorkflowResponse = await post(
      origin,
      "/workflows",
      { name: "Expiring review smoke workflow" },
      sessionCookie,
      "http://localhost:3000",
      tenantHeaders,
    );
    assertStatus(expiringWorkflowResponse, 201, "Expiring workflow creation");
    const expiringWorkflow = await expiringWorkflowResponse.json();
    const expiringActivation = await globalThis.fetch(
      `${origin}/workflows/${expiringWorkflow.id}/status`,
      {
        method: "PATCH",
        headers: {
          Origin: "http://localhost:3000",
          Cookie: sessionCookie,
          "Content-Type": "application/json",
          ...tenantHeaders,
        },
        body: JSON.stringify({ status: "ACTIVE" }),
      },
    );
    assertStatus(expiringActivation, 200, "Expiring workflow activation");
    const expiringRun = await post(
      origin,
      `/workflows/${expiringWorkflow.id}/executions`,
      { idempotencyKey: `expires_${randomBytes(12).toString("hex")}` },
      sessionCookie,
      "http://localhost:3000",
      tenantHeaders,
    );
    assertStatus(expiringRun, 201, "Expiring review request");
    const expiringExecution = await expiringRun.json();
    const expiringRequest =
      await isolatedPrisma.approvalRequest.findFirstOrThrow({
        where: { workflowExecutionId: expiringExecution.id },
      });
    await isolatedPrisma.approvalRequest.update({
      where: { id: expiringRequest.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    worker = spawn(process.execPath, ["apps/api/dist/worker.js"], {
      env: {
        ...process.env,
        DATABASE_URL: isolatedUrl.toString(),
        NODE_ENV: "development",
        AUTH_EMAIL_TRANSPORT: "development",
      },
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    });
    let finished = false;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const refreshed = await isolatedPrisma.workflowExecution.findUnique({
        where: { id: execution.id },
        include: { steps: true, outboxEvents: true },
      });
      if (
        refreshed?.status === "SUCCEEDED" &&
        refreshed.steps[0]?.status === "SUCCEEDED" &&
        refreshed.outboxEvents[0]?.status === "COMPLETED"
      ) {
        finished = true;
        break;
      }
      await new Promise((resolve) => globalThis.setTimeout(resolve, 250));
    }
    if (!finished)
      throw new Error("Dry-run outbox worker did not complete the execution.");
    let expiryFinished = false;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const [request, run] = await Promise.all([
        isolatedPrisma.approvalRequest.findUnique({
          where: { id: expiringRequest.id },
        }),
        isolatedPrisma.workflowExecution.findUnique({
          where: { id: expiringExecution.id },
        }),
      ]);
      if (request?.status === "EXPIRED" && run?.status === "CANCELLED") {
        expiryFinished = true;
        break;
      }
      await new Promise((resolve) => globalThis.setTimeout(resolve, 250));
    }
    if (!expiryFinished) {
      throw new Error("The worker did not expire the pending review.");
    }
    const expiredDecision = await post(
      origin,
      `/approvals/${expiringRequest.id}/decisions`,
      { decision: "APPROVED" },
      sessionCookie,
      "http://localhost:3000",
      tenantHeaders,
    );
    assertStatus(expiredDecision, 409, "Expired review cannot be approved");
    const completedEvents = await isolatedPrisma.activityEvent.findMany({
      where: {
        organizationId: bootstrapped.organization.id,
        workspaceId: bootstrapped.workspace.id,
        resourceId: execution.id,
      },
    });
    for (const action of [
      "workflow.execution_started",
      "workflow.step_completed",
      "workflow.dry_run_completed",
    ]) {
      if (!completedEvents.some((event) => event.action === action)) {
        throw new Error(`Missing dry-run audit transition: ${action}.`);
      }
    }
    const workflowAudit = await globalThis.fetch(
      `${origin}/activity?category=WORKFLOWS&workflowId=${encodeURIComponent(workflow.id)}&sort=OLDEST`,
      { headers: { Cookie: sessionCookie, ...tenantHeaders } },
    );
    assertStatus(workflowAudit, 200, "Tenant-scoped workflow audit query");
    const workflowAuditBody = await workflowAudit.json();
    if (
      !workflowAuditBody.items?.some(
        (event) => event.action === "workflow.dry_run_completed",
      )
    ) {
      throw new Error(
        "Workflow audit query did not include the completed action.",
      );
    }
    assertStatus(
      await globalThis.fetch(`${origin}/health/worker`),
      200,
      "Worker heartbeat readiness",
    );
    // A fresh process must be able to consume the next approved action.
    if (!(await stopWorkerProcess(worker))) {
      throw new Error(
        "Worker did not exit within its graceful shutdown period.",
      );
    }
    const stoppedHeartbeat = await isolatedPrisma.workerHeartbeat.findFirst({
      orderBy: { startedAt: "desc" },
      select: { stoppedAt: true },
    });
    if (!stoppedHeartbeat?.stoppedAt) {
      throw new Error("Worker did not record a graceful stop.");
    }
    assertStatus(
      await globalThis.fetch(`${origin}/health/worker`),
      503,
      "Stopped worker readiness",
    );
    worker = undefined;
    const internalResponse = await post(
      origin,
      "/workflows",
      {
        name: "Internal smoke notification",
        description: "A real in-app notification, not an external delivery.",
        actionType: "INTERNAL_NOTIFICATION",
      },
      sessionCookie,
      "http://localhost:3000",
      tenantHeaders,
    );
    assertStatus(internalResponse, 201, "Internal-action workflow creation");
    const internalWorkflow = await internalResponse.json();
    if (internalWorkflow.actionType !== "INTERNAL_NOTIFICATION") {
      throw new Error("Internal action was not persisted.");
    }
    const unsafePolicy = await globalThis.fetch(
      `${origin}/workflows/${internalWorkflow.id}/policy`,
      {
        method: "PATCH",
        headers: {
          Origin: "http://localhost:3000",
          Cookie: sessionCookie,
          "Content-Type": "application/json",
          ...tenantHeaders,
        },
        body: JSON.stringify({ mode: "ALLOW_DRY_RUN" }),
      },
    );
    assertStatus(unsafePolicy, 409, "Internal action cannot bypass approval");
    const activateInternal = await globalThis.fetch(
      `${origin}/workflows/${internalWorkflow.id}/status`,
      {
        method: "PATCH",
        headers: {
          Origin: "http://localhost:3000",
          Cookie: sessionCookie,
          "Content-Type": "application/json",
          ...tenantHeaders,
        },
        body: JSON.stringify({ status: "ACTIVE" }),
      },
    );
    assertStatus(activateInternal, 200, "Internal workflow activation");
    const internalKey = `internal_${randomBytes(12).toString("hex")}`;
    const requestedInternal = await post(
      origin,
      `/workflows/${internalWorkflow.id}/executions`,
      { idempotencyKey: internalKey },
      sessionCookie,
      "http://localhost:3000",
      tenantHeaders,
    );
    assertStatus(requestedInternal, 201, "Internal notification request");
    const internalExecution = await requestedInternal.json();
    if (internalExecution.status !== "WAITING_FOR_APPROVAL") {
      throw new Error("Internal notification skipped human review.");
    }
    const internalRequest =
      await isolatedPrisma.approvalRequest.findFirstOrThrow({
        where: {
          organizationId: bootstrapped.organization.id,
          workspaceId: bootstrapped.workspace.id,
          workflowExecutionId: internalExecution.id,
        },
      });
    const deniedInternal = await post(
      origin,
      `/approvals/${internalRequest.id}/decisions`,
      { decision: "APPROVED" },
      viewerCookie,
      "http://localhost:3000",
      tenantHeaders,
    );
    assertStatus(deniedInternal, 403, "Viewer internal approval denied");
    const approvedInternal = await post(
      origin,
      `/approvals/${internalRequest.id}/decisions`,
      { decision: "APPROVED" },
      sessionCookie,
      "http://localhost:3000",
      tenantHeaders,
    );
    assertStatus(approvedInternal, 201, "Internal notification approval");
    worker = spawn(process.execPath, ["apps/api/dist/worker.js"], {
      env: {
        ...process.env,
        DATABASE_URL: isolatedUrl.toString(),
        NODE_ENV: "development",
        AUTH_EMAIL_TRANSPORT: "development",
      },
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    });
    let internalCompleted = false;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const current = await isolatedPrisma.workflowExecution.findFirst({
        where: {
          id: internalExecution.id,
          organizationId: bootstrapped.organization.id,
          workspaceId: bootstrapped.workspace.id,
        },
        include: { notification: true, outboxEvents: true },
      });
      if (
        current?.status === "SUCCEEDED" &&
        current.notification?.title === "Internal smoke notification" &&
        current.outboxEvents[0]?.status === "COMPLETED"
      ) {
        internalCompleted = true;
        break;
      }
      await new Promise((resolve) => globalThis.setTimeout(resolve, 250));
    }
    if (!internalCompleted) {
      throw new Error(
        "Approved internal action did not persist a notification.",
      );
    }
    const ownedNotifications = await globalThis.fetch(
      `${origin}/notifications`,
      {
        headers: { Cookie: sessionCookie, ...tenantHeaders },
      },
    );
    assertStatus(ownedNotifications, 200, "Own internal notifications");
    const notificationList = await ownedNotifications.json();
    const notification = notificationList.items.find(
      (item) => item.workflowExecutionId === internalExecution.id,
    );
    if (!notification || notificationList.unreadCount !== 1) {
      throw new Error(
        "Internal notification was not visible to its recipient.",
      );
    }
    if (notification.workflowExecution?.workflowId !== internalWorkflow.id) {
      throw new Error("Notification did not include its workflow destination.");
    }
    const executionHistory = await globalThis.fetch(
      `${origin}/workflows/${internalWorkflow.id}/executions`,
      { headers: { Cookie: sessionCookie, ...tenantHeaders } },
    );
    assertStatus(executionHistory, 200, "Execution history");
    const completedHistory = (await executionHistory.json()).find(
      (item) => item.id === internalExecution.id,
    );
    if (
      completedHistory?.status !== "SUCCEEDED" ||
      completedHistory?.outboxEvents?.[0]?.status !== "COMPLETED" ||
      !completedHistory?.completedAt
    ) {
      throw new Error(
        "Execution history lacked the persisted result or worker state.",
      );
    }
    const otherNotifications = await globalThis.fetch(
      `${origin}/notifications`,
      {
        headers: { Cookie: sessionCookie, ...otherWorkspaceHeaders },
      },
    );
    assertStatus(otherNotifications, 200, "Other workspace notifications");
    if ((await otherNotifications.json()).items.length !== 0) {
      throw new Error("Notification leaked to another workspace.");
    }
    const viewerNotifications = await globalThis.fetch(
      `${origin}/notifications`,
      {
        headers: { Cookie: viewerCookie, ...tenantHeaders },
      },
    );
    assertStatus(viewerNotifications, 200, "Other membership notifications");
    if ((await viewerNotifications.json()).items.length !== 0) {
      throw new Error("Notification leaked to another member.");
    }
    const crossRead = await globalThis.fetch(
      `${origin}/notifications/${notification.id}/read`,
      {
        method: "PATCH",
        headers: {
          Origin: "http://localhost:3000",
          Cookie: sessionCookie,
          ...otherWorkspaceHeaders,
        },
      },
    );
    assertStatus(crossRead, 404, "Cross-workspace notification read denied");
    const read = await globalThis.fetch(
      `${origin}/notifications/${notification.id}/read`,
      {
        method: "PATCH",
        headers: {
          Origin: "http://localhost:3000",
          Cookie: sessionCookie,
          ...tenantHeaders,
        },
      },
    );
    assertStatus(read, 200, "Notification marked read");
    if (!(await read.json()).readAt) {
      throw new Error("Read receipt was not persisted.");
    }
    if (
      (await isolatedPrisma.notification.count({
        where: { workflowExecutionId: internalExecution.id },
      })) !== 1
    ) {
      throw new Error("Duplicate internal notifications were created.");
    }
  } finally {
    await isolatedPrisma.$disconnect();
    await stopWorkerProcess(worker);
    worker = undefined;
  }

  const login = await post(origin, "/auth/login", { email, password });
  assertStatus(login, 200, "Login");
  const loginCookie = cookieFrom(login, "aop_session");
  if (!loginCookie) throw new Error("Login cookie was not set.");

  const logout = await post(origin, "/auth/logout", {}, loginCookie);
  assertStatus(logout, 204, "Logout");
  const revoked = await globalThis.fetch(`${origin}/auth/session`, {
    headers: { Cookie: loginCookie },
  });
  assertStatus(revoked, 401, "Revoked session");

  const recovery = await post(origin, "/auth/forgot-password", {
    email: "missing@example.invalid",
  });
  assertStatus(recovery, 202, "Generic password recovery");
  const recoveryBody = await recovery.json();
  if ("resetToken" in recoveryBody) {
    throw new Error("Recovery response exposed a reset token.");
  }
  process.stdout.write(
    "Isolated PostgreSQL flow passed: auth, workspace, lead, conversation, follow-up, settings, workflow/policy/approval, dry-run and internal-notification outbox actions across a worker process restart, tenant isolation, CSRF and recovery.\n",
  );
} finally {
  if (api && api.exitCode === null) {
    api.kill();
    await new Promise((resolve) => api.once("exit", resolve));
  }
  await stopWorkerProcess(worker);
  if (created) {
    await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    process.stdout.write("Removed only the generated auth test schema.\n");
  }
  await admin.$disconnect();
}
