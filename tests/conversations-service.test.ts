import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ConversationsApiError,
  conversationsService,
} from "../apps/web/lib/conversations/conversations-service";
import type { WorkspaceSelection } from "../apps/web/lib/tenancy/tenancy-service";

const workspace: WorkspaceSelection = {
  organizationId: "00000000-0000-4000-8000-000000000001",
  organizationName: "Test organization",
  workspaceId: "00000000-0000-4000-8000-000000000002",
  workspaceName: "Test workspace",
  role: "SALES",
};

afterEach(() => vi.unstubAllGlobals());

describe("Conversations frontend API boundary", () => {
  it("sends cookie-backed verified workspace selectors and bounded query values", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ items: [], page: 1, limit: 20, total: 0 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetcher);

    await conversationsService.list(workspace, {
      page: 1,
      limit: 20,
      search: "enquiry",
      status: "OPEN",
      sort: "NEWEST_ACTIVITY",
    });

    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/conversations?");
    expect(url).toContain("search=enquiry");
    expect(init.credentials).toBe("include");
    expect(init.headers).toMatchObject({
      "X-AOP-Organization-Id": workspace.organizationId,
      "X-AOP-Workspace-Id": workspace.workspaceId,
    });
    expect(JSON.stringify(init)).not.toMatch(
      /userId|membershipId|role|actorId/,
    );
  });

  it("posts message content without pretending to deliver it externally", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "message" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);

    await conversationsService.send(workspace, "conversation/id", {
      content: "Internal reply",
    });

    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/conversations/conversation%2Fid/messages");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ content: "Internal reply" }));
  });

  it("translates tenant-safe not-found responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "CONVERSATION_NOT_FOUND" }), {
          status: 404,
        }),
      ),
    );

    await expect(
      conversationsService.get(workspace, "foreign-id"),
    ).rejects.toMatchObject({
      name: "Error",
      status: 404,
      code: "CONVERSATION_NOT_FOUND",
    } satisfies Partial<ConversationsApiError>);
  });
});
