import orchestrator from "tests/orchestrator";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET to /api/v1/public_assets/[code]", () => {
  describe("Anonymous User", () => {
    test("with no session", async () => {
      const getResponse = await getPublicAssetRequest("B3SA3.SA", {});

      expect(getResponse.status).toBe(401);

      const getResponseBody = await getResponse.json();
      expect(getResponseBody).toEqual({
        name: "UnauthorizedError",
        message: "Unable to Find a Valid Session",
        action: "Please, review session information",
        status_code: 401,
      });
    });
  });
  describe("Defined User", () => {
    test("with valid search term", async () => {
      const testUser = await orchestrator.createUser({});
      const testSession = await orchestrator.createSession(testUser.id);
      const getResponse = await getPublicAssetRequest("xp", testSession);

      expect(getResponse.status).toBe(200);

      const getResponseBody = await getResponse.json();

      const searchItems = getResponseBody;

      //
      expect(searchItems.length > 0).toBe(true);
      console.log(searchItems);
    });
    test("with invalid public asset", async () => {
      const testUser = await orchestrator.createUser({});
      const testSession = await orchestrator.createSession(testUser.id);
      const getResponse = await getPublicAssetRequest(
        "Not An asset",
        testSession,
      );

      expect(getResponse.status).toBe(404);

      const getResponseBody = await getResponse.json();
      expect(getResponseBody).toEqual({
        name: "NotFoundError",
        message: "No Public Asset has been Found",
        action: "Please, double check searching parameters",
        status_code: 404,
      });
    });
  });
});

async function getPublicAssetRequest(search_term, sessionObject) {
  return await fetch(
    `http://localhost:3000/api/v1/public_assets/search/${search_term}`,
    {
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionObject.token}`,
      },
    },
  );
}
