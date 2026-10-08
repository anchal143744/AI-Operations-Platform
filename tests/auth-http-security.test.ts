import { describe, expect, it, vi } from "vitest";
import { AuthRateLimitGuard } from "../apps/api/src/auth/auth-rate-limit.guard";
import { AuthConfig } from "../apps/api/src/auth/auth.config";
import { CsrfOriginGuard } from "../apps/api/src/auth/csrf-origin.guard";

function config(): AuthConfig {
  return new AuthConfig({
    NODE_ENV: "test",
    APP_ORIGIN: "https://app.example.com",
    AUTH_TOKEN_PEPPER: "test-only-pepper-with-at-least-32-characters",
  });
}

function httpContext(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as never;
}

describe("CSRF origin boundary", () => {
  it("allows safe methods and exact configured origins", () => {
    const guard = new CsrfOriginGuard(config());
    expect(guard.canActivate(httpContext({ method: "GET", headers: {} }))).toBe(
      true,
    );
    expect(
      guard.canActivate(
        httpContext({
          method: "POST",
          headers: { origin: "https://app.example.com" },
        }),
      ),
    ).toBe(true);
  });

  it("rejects missing, malformed, and cross-origin unsafe requests", () => {
    const guard = new CsrfOriginGuard(config());
    for (const origin of [undefined, "not-a-url", "https://evil.example"]) {
      expect(() =>
        guard.canActivate(httpContext({ method: "POST", headers: { origin } })),
      ).toThrow("This request origin is not allowed.");
    }
  });
});

describe("authentication abuse limiter", () => {
  it("enforces a shared fixed-window limit", async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue({
        limit: 2,
        windowMs: 60_000,
      }),
    };
    const store = {
      consume: vi
        .fn()
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3),
    };
    const guard = new AuthRateLimitGuard(
      reflector as never,
      store as never,
      config(),
      {} as never,
    );
    const context = httpContext({
      ip: "127.0.0.1",
      method: "POST",
      path: "/auth/login",
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(guard.canActivate(context)).rejects.toThrow(
      "Too many requests. Try again later.",
    );
    expect(store.consume).toHaveBeenCalledTimes(3);
    expect(store.consume.mock.calls[0]?.[0]).toMatch(/^[a-f0-9]{64}$/);
  });

  it("fails closed when the shared store is unavailable", async () => {
    const reflector = {
      getAllAndOverride: vi
        .fn()
        .mockReturnValue({ limit: 2, windowMs: 60_000 }),
    };
    const store = {
      consume: vi.fn().mockRejectedValue(new Error("database unavailable")),
    };
    const guard = new AuthRateLimitGuard(
      reflector as never,
      store as never,
      config(),
      {} as never,
    );
    await expect(
      guard.canActivate(
        httpContext({ ip: "127.0.0.1", method: "POST", path: "/auth/login" }),
      ),
    ).rejects.toMatchObject({
      response: { statusCode: 503, code: "SERVICE_UNAVAILABLE" },
    });
  });
});
