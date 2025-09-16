import orchestrator from "tests/orchestrator";
import setCookieParser from "set-cookie-parser";
import session from "model/session";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET to /api/v1/asset_types", () => {
  describe("Anonimous User", () => {
    test("with valid  session", async () => {
      const createdUser = await orchestrator.createUser({});
      const sessionObject = await orchestrator.createSession(createdUser.id);

      const response = await getAssetTypesRequest(sessionObject);
      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody.length > 0).toBe(true);
      const assetTypeSample = responseBody[0];
      expect(Object.keys(assetTypeSample).length).toBe(3);
      expect(assetTypeSample).toHaveProperty("code");
      expect(assetTypeSample).toHaveProperty("name");
      expect(assetTypeSample).toHaveProperty("description");
    });
    test("With halfway-expired session", async () => {
      jest.useFakeTimers({
        now: new Date(Date.now() - session.TIMEOUT_IN_MILISECONDS / 2),
      });
      const createdUser = await orchestrator.createUser({});
      const sessionObject = await orchestrator.createSession(createdUser.id);

      const response = await getAssetTypesRequest(sessionObject);
      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody.length > 0).toBe(true);
      const assetTypeSample = responseBody[0];
      expect(Object.keys(assetTypeSample).length).toBe(3);
      expect(assetTypeSample).toHaveProperty("code");
      expect(assetTypeSample).toHaveProperty("name");
      expect(assetTypeSample).toHaveProperty("description");
    });
    test("with invalid  session", async () => {
      const invalidSession = {
        token:
          "3e5b70f82f559ef2b3596d291548f1e25f2ffb42c645b71cb7fb6b220f432482e8c6fd50be7baefb9ab2aab991d1f841",
      };

      const response = await getAssetTypesRequest(invalidSession);
      expect(response.status).toBe(401);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Unable to Find a Valid Session",
        action: "Please, review session information",
        status_code: 401,
      });

      // Set-Cookie assertions
      const parsedSetCookie = setCookieParser(response, {
        map: true,
      });

      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: "invalid",
        maxAge: -1,
        path: "/",
        httpOnly: true,
      });
    });
    test("with existing, but expired, session", async () => {
      jest.useFakeTimers({
        now: new Date(Date.now() - session.TIMEOUT_IN_MILISECONDS),
      });
      const createdUser = await orchestrator.createUser({});
      const sessionObject = await orchestrator.createSession(createdUser.id);

      jest.useRealTimers();
      const response = await getAssetTypesRequest(sessionObject);
      expect(response.status).toBe(401);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Unable to Find a Valid Session",
        action: "Please, review session information",
        status_code: 401,
      });
      // Set-Cookie assertions
      const parsedSetCookie = setCookieParser(response, {
        map: true,
      });
      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: "invalid",
        maxAge: -1,
        path: "/",
        httpOnly: true,
      });
    });
  });
});

async function getAssetTypesRequest(sessionObject) {
  return await fetch("http://localhost:3000/api/v1/asset_types", {
    headers: {
      Cookie: `session_id=${sessionObject.token}`,
    },
  });
}
