import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("GET to /api/v1/migrations", () => {
  describe("Anonymous User", () => {
    test("Retrieving current system status", async () => {
      const response = await fetch("http://localhost:3000/api/v1/status");
      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toBeDefined();

      const parsedUpdatedAt = new Date(responseBody.updated_at).toISOString();
      expect(responseBody.updated_at).toEqual(parsedUpdatedAt);

      const databaseStatus = responseBody.dependencies.database;
      expect(databaseStatus).toBeDefined();

      expect(databaseStatus.version).toBe("16.4");

      expect(typeof databaseStatus.max_connections).toBe("number");
      expect(databaseStatus.max_connections).toBeGreaterThan(0);

      expect(typeof databaseStatus.current_connections).toBe("number");
      expect(databaseStatus.current_connections).toBeGreaterThan(-1);
    });
  });
});
