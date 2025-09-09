import orchestrator from "tests/orchestrator";
import { version as uuidVersion } from "uuid";
import setCookieParser from "set-cookie-parser";
import session from "model/session";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST to /api/v1/sessions", () => {
  describe("Anonymous User", () => {
    test("with incorrect `email` and `password`", async () => {
      const response = await postCreateSessionRequest({
        email: "unexsiting@test.com",
        password: "NOTcorrectP@ssword",
      });
      expect(response.status).toBe(401);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Login data does not match",
        action: "Please review login information and try again",
        status_code: 401,
      });
    });
    test("with incorrect `email` but correct `password`", async () => {
      await orchestrator.createUser({
        email: "valid@useremail.com",
        password: "validP@assword",
      });
      const response = await postCreateSessionRequest({
        email: "incorrect@useremail.com",
        password: "validP@assword",
      });
      expect(response.status).toBe(401);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Login data does not match",
        action: "Please review login information and try again",
        status_code: 401,
      });
    });
    test("with incorrect `password` but correct `email`", async () => {
      await orchestrator.createUser({
        email: "another.valid@useremail.com",
        password: "validP@assword",
      });
      const response = await postCreateSessionRequest({
        email: "another.valid@useremail.com",
        password: "NOTcorrectP@ssword",
      });
      expect(response.status).toBe(401);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Login data does not match",
        action: "Please review login information and try again",
        status_code: 401,
      });
    });
    test("with correct credentials", async () => {
      await orchestrator.createUser({
        email: "user@valid.com",
        password: "validP@assword!",
      });
      const response = await postCreateSessionRequest({
        email: "user@valid.com",
        password: "validP@assword!",
      });
      expect(response.status).toBe(201);

      const responseBody = await response.json();
      expect(responseBody.id).toBeDefined();
      expect(responseBody.token).toBeDefined();
      expect(uuidVersion(responseBody.user_id)).toBe(4);
      expect(Date.parse(responseBody.created_date)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_date)).not.toBeNaN();
      expect(Date.parse(responseBody.expire_date)).not.toBeNaN();
      expect(responseBody.expire_date > responseBody.created_date).toBe(true);

      const parsedSetCookie = setCookieParser(response, {
        map: true,
      });
      console.log(parsedSetCookie);
      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: responseBody.token,
        maxAge: session.TIMEOUT_IN_MILISECONDS / 1000,
        path: "/",
        httpOnly: true,
      });
    });
  });
});

async function postCreateSessionRequest(userProps) {
  return await fetch("http://localhost:3000/api/v1/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: userProps.email,
      password: userProps.password,
    }),
  });
}
