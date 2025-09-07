import orchestrator from "tests/orchestrator";
import { version as uuidVersion } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET to /api/v1/users/[email]", () => {
  describe("Anonymous User", () => {
    test("with exact case match", async () => {
      await orchestrator.createUser({
        name: "Exact Case Match",
        email: "test@exactmatch.com",
        password: "Test123",
      });

      const getResponse = await getUserRequest("test@exactmatch.com");

      expect(getResponse.status).toBe(200);

      const getResponseBody = await getResponse.json();
      expect(getResponseBody).toEqual({
        id: getResponseBody.id,
        name: "Exact Case Match",
        email: "test@exactmatch.com",
        password: getResponseBody.password,
        created_date: getResponseBody.created_date,
        updated_date: getResponseBody.updated_date,
      });
      expect(uuidVersion(getResponseBody.id)).toBe(4);
      expect(Date.parse(getResponseBody.created_date)).not.toBeNaN();
      expect(Date.parse(getResponseBody.updated_date)).not.toBeNaN();
    });
    test("with case mismatch", async () => {
      await orchestrator.createUser({
        name: "Case Missmatch",
        email: "test@casemismatch.com",
        password: "Teste123",
      });

      const getResponse = await getUserRequest("Test@CaseMismatch.com");

      expect(getResponse.status).toBe(200);

      const getResponseBody = await getResponse.json();
      expect(getResponseBody).toEqual({
        id: getResponseBody.id,
        name: "Case Missmatch",
        email: "test@casemismatch.com",
        password: getResponseBody.password,
        created_date: getResponseBody.created_date,
        updated_date: getResponseBody.updated_date,
      });
      expect(uuidVersion(getResponseBody.id)).toBe(4);
      expect(Date.parse(getResponseBody.created_date)).not.toBeNaN();
      expect(Date.parse(getResponseBody.updated_date)).not.toBeNaN();
    });
    test("With non-existing user", async () => {
      const getResponse = await getUserRequest("user@notexists.com");

      expect(getResponse.status).toBe(404);

      const getResponseBody = await getResponse.json();
      expect(getResponseBody).toEqual({
        message: "User Not Found",
        action: "Please, check if the E-mail is correct",
        name: "NotFoundError",
        status_code: 404,
      });
    });
  });
});

async function getUserRequest(email) {
  return await fetch(`http://localhost:3000/api/v1/users/${email}`);
}
