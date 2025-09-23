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
    test("with valid public asset", async () => {
      const testUser = await orchestrator.createUser({});
      const testSession = await orchestrator.createSession(testUser.id);
      const getResponse = await getPublicAssetRequest("B3SA3.SA", testSession);

      expect(getResponse.status).toBe(200);

      const getResponseBody = await getResponse.json();

      const ticker = getResponseBody;

      //
      expect(ticker.code).toBe("B3SA3.SA");
      expect(ticker.name).toBeDefined();
      expect(ticker.currency_code).toBe("BRL");
      expect(ticker.market_value).toBeDefined();
      expect(ticker.yfinance_compatible).toBeDefined();
      expect(ticker.asset_type_code).toBeDefined();
      expect(Date.parse(ticker.created_date)).not.toBeNaN();
      expect(Date.parse(ticker.updated_date)).not.toBeNaN();
    });
    test("with invalid public asset", async () => {
      const testUser = await orchestrator.createUser({});
      const testSession = await orchestrator.createSession(testUser.id);
      const getResponse = await getPublicAssetRequest("BXSX0.SA", testSession);

      expect(getResponse.status).toBe(404);

      const getResponseBody = await getResponse.json();
      expect(getResponseBody).toEqual({
        name: "NotFoundError",
        message: "No Public Asset has been Found",
        action: "Please, double check public asset code",
        status_code: 404,
      });
    });
  });
});

async function getPublicAssetRequest(code, sessionObject) {
  return await fetch(
    `http://localhost:3000/api/v1/public_assets/code/${code}`,
    {
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionObject.token}`,
      },
    },
  );
}
