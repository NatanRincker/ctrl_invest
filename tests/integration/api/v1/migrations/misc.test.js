import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
});

describe("Not-Allowed Method to /api/v1/migrations", () => {
  describe("Anonymous User PUT request", () => {
    test("should return 405", async () => {
      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        method: "PUT",
      });
      expect(response.status).toBe(405);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "MethodNotAllowedError",
        message: "Method not allowed for this endpoint",
        action: "Check if this method is supposed to be valid",
        status_code: 405,
      });
    });
  });
  describe("Anonymous User DELETE request", () => {
    test("should return 405", async () => {
      const response = await fetch("http://localhost:3000/api/v1/migrations", {
        method: "DELETE",
      });
      expect(response.status).toBe(405);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "MethodNotAllowedError",
        message: "Method not allowed for this endpoint",
        action: "Check if this method is supposed to be valid",
        status_code: 405,
      });
    });
  });
});
