/** Allows a named test database or this project's generated local test schema. */
export function assertDisposableTestDatabaseUrl(value: string): void {
  const url = new URL(value);
  const localhost = ["localhost", "127.0.0.1"].includes(url.hostname);
  const namedTestDatabase = url.pathname.toLowerCase().includes("test");
  const generatedTestSchema =
    localhost &&
    url.pathname === "/ai_operations" &&
    /^aop_test_[0-9a-f]{12}$/.test(url.searchParams.get("schema") ?? "");
  if (!localhost || (!namedTestDatabase && !generatedTestSchema)) {
    throw new Error(
      "Integration tests require a disposable local test database or generated test schema.",
    );
  }
}
