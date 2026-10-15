import { randomBytes, randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

// These tests create real accounts and records. They may run only against an
// explicitly selected disposable, loopback PostgreSQL database.
test.beforeAll(() => {
  const raw = process.env.DATABASE_URL;
  if (process.env.AOP_E2E_DISPOSABLE_DB !== "true" || !raw) {
    throw new Error(
      "Browser E2E requires AOP_E2E_DISPOSABLE_DB=true and a disposable DATABASE_URL.",
    );
  }
  const url = new URL(raw);
  const database = decodeURIComponent(url.pathname).toLowerCase();
  const schema = (url.searchParams.get("schema") ?? "").toLowerCase();
  if (
    !["localhost", "127.0.0.1", "::1"].includes(url.hostname) ||
    !(database.includes("test") || schema.includes("test"))
  ) {
    throw new Error("Browser E2E refuses a non-loopback or non-test database.");
  }
});

function monitorBrowser(
  page: Page,
  expectedFailureUrl?: string,
  expectSignedOutSession = false,
) {
  const errors: string[] = [];
  let expectedFailures = 0;
  let signedOutResponses = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (expectedFailureUrl && message.text().includes("503")) return;
    if (
      expectSignedOutSession &&
      message.text() ===
        "Failed to load resource: the server responded with a status of 401 (Unauthorized)"
    )
      return;
    errors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    if (
      /ERR_ABORTED|NS_BINDING_ABORTED/.test(request.failure()?.errorText ?? "")
    )
      return;
    errors.push(`Network request failed: ${request.url()}`);
  });
  page.on("response", (response) => {
    if (
      expectSignedOutSession &&
      response.status() === 401 &&
      new URL(response.url()).pathname === "/auth/session"
    ) {
      signedOutResponses += 1;
      return;
    }
    if (response.status() < 400) return;
    if (
      expectedFailureUrl &&
      response.url() === expectedFailureUrl &&
      response.status() === 503
    ) {
      expectedFailures += 1;
      return;
    }
    errors.push(`Unexpected HTTP ${response.status()}: ${response.url()}`);
  });
  return () => {
    expect(errors, errors.join("\n")).toEqual([]);
    if (expectedFailureUrl) expect(expectedFailures).toBe(1);
    if (expectSignedOutSession) expect(signedOutResponses).toBeGreaterThan(0);
  };
}

async function registerAndOnboard(page: Page) {
  const marker = randomUUID().slice(0, 8);
  const email = `release-gate-${marker}@example.invalid`;
  const password = `Gate${randomBytes(18).toString("hex")}Aa1!`;

  await page.goto("/signup");
  await page.getByLabel("First name").fill("Release");
  await page.getByLabel("Last name").fill("Gate");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page.getByRole("checkbox", { name: /I agree/ }).check();
  await page.getByRole("button", { name: "Create account" }).click();
  const codeNotice = page.getByText(
    /Local development only: your verification code is \d{6}/,
  );
  await expect(codeNotice).toBeVisible();
  const code = (await codeNotice.textContent())?.match(/\b\d{6}\b/)?.[0];
  expect(code).toBeTruthy();
  await page.getByRole("link", { name: "Continue to verification" }).click();
  // The code inputs are server-rendered; wait for their client handlers before
  // typing, otherwise early keystrokes can land in the static first input.
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("textbox", { name: "Verification code digit 1 of 6" })
    .click();
  await page.keyboard.type(code!, { delay: 75 });
  for (const [index, digit] of [...code!].entries()) {
    await expect(
      page.getByRole("textbox", {
        name: `Verification code digit ${index + 1} of 6`,
      }),
    ).toHaveValue(digit);
  }
  await page.getByRole("button", { name: "Verify email" }).click();
  await page.getByRole("link", { name: "Continue to onboarding" }).click();
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByLabel("Business name").fill(`Release Gate ${marker}`);
  await page.getByLabel("Industry").selectOption("software");
  await page.getByLabel("Company size").selectOption("1–10");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Founder / Owner", { exact: true }).click();
  await expect(
    page.getByRole("radio", { name: /Founder \/ Owner/ }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Respond to enquiries faster", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Website enquiries", { exact: true }).click();
  await page.getByText("Founder / Owner", { exact: true }).click();
  await page
    .getByLabel("How quickly do you aim to respond?")
    .selectOption("same-day");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Finish setup" }).click();
  await page.getByRole("button", { name: "Continue to workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page
    .getByRole("button", { name: /Open user menu for Release Gate/ })
    .click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("authenticated workflow, approval, worker, notification, and audit persist", async ({
  page,
}) => {
  const assertNoBrowserErrors = monitorBrowser(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await registerAndOnboard(page);
  await page.goto("/workflows");
  await expect(
    page.getByText("No workflow definitions in this workspace yet."),
  ).toBeVisible();

  const name = `Release workflow ${randomUUID().slice(0, 8)}`;
  await page.getByRole("button", { name: "Create draft" }).click();
  await page.getByLabel("Workflow name").fill(name);
  await page
    .getByLabel("Description")
    .fill("Disposable browser release-gate workflow.");
  await page
    .getByLabel("Action", { exact: true })
    .selectOption("INTERNAL_NOTIFICATION");
  await page.getByRole("button", { name: "Save draft" }).click();
  const workflow = page
    .locator("article.controlled-item")
    .filter({ has: page.getByRole("heading", { name }) });
  await expect(workflow).toBeVisible();
  await workflow.getByRole("button", { name: "Edit definition" }).click();
  await workflow.getByLabel("Description").fill("Edited immutable definition.");
  await workflow.getByRole("button", { name: "Save new version" }).click();
  await expect(workflow).toContainText("Definition v2");
  await workflow.getByLabel("Policy").selectOption("REQUIRE_APPROVAL");
  await workflow.getByRole("button", { name: "Version history" }).click();
  await expect(workflow.getByText("Version 2", { exact: false })).toBeVisible();
  await workflow.getByRole("button", { name: "Activate" }).click();
  await workflow.getByRole("button", { name: "Request notification" }).click();
  await expect(workflow).toContainText("WAITING FOR APPROVAL");
  await page.goto("/approvals");
  const review = page
    .locator("article.controlled-item")
    .filter({ has: page.getByRole("heading", { name }) });
  await expect(review).toBeVisible();
  await review.getByText("Review request details").click();
  await expect(review).toContainText("APPROVAL_REQUIRED");
  await review.getByRole("button", { name: "Approve action" }).click();
  await expect(review).toContainText("APPROVED");
  await page.goto("/workflows");
  const active = page
    .locator("article.controlled-item")
    .filter({ has: page.getByRole("heading", { name }) });
  await active.getByRole("button", { name: "Execution status" }).click();
  await expect(active.getByText("SUCCEEDED", { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await page.getByRole("button", { name: /Open notifications/ }).click();
  await expect(
    page.getByRole("region", { name: "Workspace notifications" }),
  ).toContainText(name);
  await page.getByRole("button", { name: "Mark as read" }).click();
  await expect(
    page.getByRole("region", { name: "Workspace notifications" }),
  ).toContainText("Read");
  await page.getByRole("button", { name: "Close notifications" }).click();
  await active.getByRole("link", { name: "Audit history" }).click();
  await expect(page).toHaveURL(/\/activity\?workflowId=/);
  await expect(
    page.getByRole("list", { name: "Activity events" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("list", { name: "Activity events" }),
  ).toBeVisible();
  await page.goto("/workflows");
  await expect(
    page.locator("article.controlled-item").filter({ hasText: name }),
  ).toContainText("Definition v3");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  assertNoBrowserErrors();
});

test("lead and conversation records persist across reload in the selected workspace", async ({
  page,
}) => {
  const assertNoBrowserErrors = monitorBrowser(page);
  await registerAndOnboard(page);
  const marker = randomUUID().slice(0, 8);
  const leadName = `Release lead ${marker}`;
  const participantName = `Release contact ${marker}`;

  await page.goto("/leads");
  await page.getByRole("button", { name: "Add lead" }).click();
  const leadForm = page.locator("form.lead-create-form");
  await leadForm.getByLabel("Lead name").fill(leadName);
  await leadForm.getByLabel("Company").fill("Disposable release test");
  await leadForm.getByRole("button", { name: "Create lead" }).click();
  const leadList = page.getByRole("list", {
    name: "Leads in selected workspace",
  });
  await expect(
    leadList.getByRole("link", { name: new RegExp(leadName) }),
  ).toBeVisible();
  await page.reload();
  await expect(
    leadList.getByRole("link", { name: new RegExp(leadName) }),
  ).toBeVisible();
  await leadList.getByRole("link", { name: new RegExp(leadName) }).click();
  await expect(page.getByRole("heading", { name: leadName })).toBeVisible();

  await page.goto("/inbox");
  await page.getByRole("button", { name: "New conversation" }).click();
  await page.getByLabel("Participant name").fill(participantName);
  await page.getByLabel("Subject").fill("Disposable persistence check");
  await page.getByRole("button", { name: "Create conversation" }).click();
  const conversationLink = page.getByRole("link", {
    name: new RegExp(participantName),
  });
  await expect(conversationLink).toBeVisible();
  await page.reload();
  await expect(conversationLink).toBeVisible();
  await conversationLink.click();
  await expect(
    page.getByRole("heading", { name: participantName }),
  ).toBeVisible();
  assertNoBrowserErrors();
});

test("signed-out access does not expose workflow data", async ({ page }) => {
  const assertNoBrowserErrors = monitorBrowser(page, undefined, true);
  await page.goto("/workflows");
  await expect(
    page.getByRole("heading", { name: "Sign in to continue" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login",
  );
  await expect(page.getByRole("button", { name: "Create draft" })).toHaveCount(
    0,
  );
  assertNoBrowserErrors();
});

test("authentication forms cannot submit secrets as GET before hydration", async ({
  browser,
}) => {
  const origin = process.env.AOP_E2E_WEB_ORIGIN ?? "http://localhost:3000";
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    for (const route of [
      "/login",
      "/signup",
      "/verify-email",
      "/forgot-password",
      "/reset-password",
    ]) {
      await page.goto(`${origin}${route}`);
      const form = page.locator("form.auth-form");
      await expect(form).toHaveAttribute("method", "post");
      await expect(form.locator('button[type="submit"]')).toBeDisabled();
    }
  } finally {
    await context.close();
  }
});

test("existing routes render at desktop and mobile without document overflow", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const assertNoBrowserErrors = monitorBrowser(page);
  await registerAndOnboard(page);
  const routes = [
    "/",
    "/login",
    "/signup",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
    "/onboarding",
    "/dashboard",
    "/leads",
    "/leads/demo-lead-001",
    "/inbox",
    "/inbox/demo-conversation-001",
    "/follow-ups",
    "/ai-operations",
    "/workflows",
    "/approvals",
    "/activity",
    "/settings",
  ];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status(), `${route} at ${width}px`).toBe(200);
      await expect(page.getByRole("main")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${route} overflows at ${width}px`,
      ).toBe(true);
    }
  }
  assertNoBrowserErrors();
});

test("workflow loading, failed request recovery, and rejected approval", async ({
  page,
}) => {
  const api = new URL(
    process.env.AOP_E2E_API_ORIGIN ?? "http://localhost:4000",
  );
  const assertNoBrowserErrors = monitorBrowser(page, `${api.origin}/workflows`);
  await registerAndOnboard(page);
  let failed = false;
  await page.route(
    (url) => url.origin === api.origin && url.pathname === "/workflows",
    async (route) => {
      if (failed) return route.continue();
      failed = true;
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"code":"SERVICE_UNAVAILABLE"}',
      });
    },
  );
  await page.goto("/workflows");
  await expect(page.getByText("Loading workflows…")).toBeVisible();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: /workflow control service is unavailable/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(
    page.getByText("No workflow definitions in this workspace yet."),
  ).toBeVisible();
  await page.unrouteAll({ behavior: "wait" });

  const name = `Rejected workflow ${randomUUID().slice(0, 8)}`;
  await page.getByRole("button", { name: "Create draft" }).click();
  await page.getByLabel("Workflow name").fill(name);
  await page.getByLabel("Action", { exact: true }).selectOption("DRY_RUN_LOG");
  await page.getByRole("button", { name: "Save draft" }).click();
  const workflow = page
    .locator("article.controlled-item")
    .filter({ has: page.getByRole("heading", { name }) });
  await workflow.getByLabel("Policy").selectOption("REQUIRE_APPROVAL");
  await workflow.getByRole("button", { name: "Activate" }).click();
  await workflow.getByRole("button", { name: "Request dry run" }).click();
  await page.goto("/approvals");
  const review = page
    .locator("article.controlled-item")
    .filter({ has: page.getByRole("heading", { name }) });
  await expect(review).toBeVisible();
  await review.getByRole("button", { name: "Reject" }).click();
  await expect(review).toContainText("REJECTED");
  await page.goto("/workflows");
  const active = page
    .locator("article.controlled-item")
    .filter({ has: page.getByRole("heading", { name }) });
  await active.getByRole("button", { name: "Execution status" }).click();
  await expect(active.getByText("CANCELLED", { exact: true })).toBeVisible();
  assertNoBrowserErrors();
});
