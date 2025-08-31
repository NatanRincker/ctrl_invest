import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("POST to /api/v1/status", () => {
  describe("Anonymous User", () => {
    test("Validating Method Not Allowed", async () => {
      const response = await fetch("http://localhost:3000/api/v1/status", {
        method: "POST",
      });
      const responseBody = await response.json();

      expect(response.status).toBe(405);

      expect(responseBody).toEqual({
        name: "MethodNotAllowedError",
        message: "Method not allowed for this endpoint",
        action: "Check if this method is supposed to be valid",
        status_code: 405,
      });
    });
  });
});
