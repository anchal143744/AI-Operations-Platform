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

function monitorBrowser(page: Page, expectedFailureUrl?: string) {
  const errors: string[] = [];
  let expectedFailures = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (expectedFailureUrl && message.text().includes("503")) return;
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
    if (response.status() < 500) return;
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
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("checkbox", { name: /I agree/ }).check();
  await page.getByRole("button", { name: "Create account" }).click();
  const codeNotice = page.getByText(
    /Local development only: your verification code is \d{6}/,
  );
  await expect(codeNotice).toBeVisible();
  const code = (await codeNotice.textContent())?.match(/\b\d{6}\b/)?.[0];
  expect(code).toBeTruthy();
  await page.getByRole("link", { name: "Continue to verification" }).click();
  for (const [index, digit] of [...code!].entries()) {
    await page
      .getByRole("textbox", {
        name: `Verification code digit ${index + 1} of 6`,
      })
      .fill(digit);
  }
  await page.getByRole("button", { name: "Verify email" }).click();
  await page.getByRole("link", { name: "Continue to onboarding" }).click();
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByLabel("Business name").fill(`Release Gate ${marker}`);
  await page.getByLabel("Industry").selectOption("software");
  await page.getByLabel("Company size").selectOption("1–10");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: /Founder \/ Owner/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByRole("radio", { name: /Respond to enquiries faster/ })
    .check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("checkbox", { name: "Website enquiries" }).check();
  await page.getByRole("radio", { name: "Founder / Owner" }).check();
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
  await page.getByLabel("Password").fill(password);
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
  ).toContainText("Definition v2");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  assertNoBrowserErrors();
});

test("signed-out access does not expose workflow data", async ({ page }) => {
  const assertNoBrowserErrors = monitorBrowser(page);
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
