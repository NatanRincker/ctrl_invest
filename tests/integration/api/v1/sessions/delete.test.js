import orchestrator from "tests/orchestrator";
import setCookieParser from "set-cookie-parser";
import session from "model/session";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE to /api/v1/sessions", () => {
  describe("Default User", () => {
    test("with valid  session", async () => {
      const createdUser = await orchestrator.createUser({});
      const sessionObject = await orchestrator.createSession(createdUser.id);

      const response = await deleteSessionRequest(sessionObject);
      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(
        responseBody.expire_date < sessionObject.expire_date.toISOString(),
      ).toBe(true);
      expect(
        responseBody.updated_date > sessionObject.updated_date.toISOString(),
      ).toBe(true);
      expect(responseBody.expire_date < responseBody.updated_date).toBe(true);

      //Set-Cookie assertion
      const parsedSetCookie = setCookieParser(response, {
        map: true,
      });
      console.log(parsedSetCookie);
      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: "invalid",
        maxAge: -1,
        path: "/",
        httpOnly: true,
      });

      // Double check
      const expiredSessionUserRes = await fetch(
        "http://localhost:3000/api/v1/user",
        {
          headers: {
            Cookie: `session_id=${sessionObject.token}`,
          },
        },
      );
      expect(expiredSessionUserRes.status).toBe(401);

      const expiredSessionUserResBody = await expiredSessionUserRes.json();

      expect(expiredSessionUserResBody).toEqual({
        name: "UnauthorizedError",
        message: "Unable to Find a Valid Session",
        action: "Please, review session information",
        status_code: 401,
      });
    });
    test("with invalid  session", async () => {
      const invalidSession = {
        token:
          "3e5b70f82f559ef2b3596d291548f1e25f2ffb42c645b71cb7fb6b220f432482e8c6fd50be7baefb9ab2aab991d1f841",
      };

      const response = await deleteSessionRequest(invalidSession);
      expect(response.status).toBe(401);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Unable to Find a Valid Session",
        action: "Please, review session information",
        status_code: 401,
      });
    });
    test("with existing, but expired, session", async () => {
      jest.useFakeTimers({
        now: new Date(Date.now() - session.TIMEOUT_IN_MILISECONDS),
      });
      const createdUser = await orchestrator.createUser({
        email: "user_with_expired_session@test.com",
      });
      const sessionObject = await orchestrator.createSession(createdUser.id);

      jest.useRealTimers();
      const response = await deleteSessionRequest(sessionObject);
      expect(response.status).toBe(401);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Unable to Find a Valid Session",
        action: "Please, review session information",
        status_code: 401,
      });
    });
  });
});

async function deleteSessionRequest(sessionObject) {
  return await fetch("http://localhost:3000/api/v1/sessions", {
    method: "DELETE",
    headers: {
      Cookie: `session_id=${sessionObject.token}`,
    },
  });
}
