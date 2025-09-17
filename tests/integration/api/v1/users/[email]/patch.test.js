import orchestrator from "tests/orchestrator";
import { version as uuidVersion } from "uuid";
import password from "model/password.js";
import user from "model/user.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH to /api/v1/users/[email]", () => {
  describe("Anonymous User", () => {
    test("with duplicated email", async () => {
      await orchestrator.createUser({
        email: "Teste1@original.com",
      });

      const testUser = await orchestrator.createUser({
        email: "Teste1@second.com",
      });
      const testSession = await orchestrator.createSession(testUser.id);
      const patchResponse = await patchUserRequest(
        "Teste1@second.com",
        {
          email: "Teste1@original.com",
        },
        testSession,
      );
      expect(patchResponse.status).toBe(400);
      const patchResponseBody = await patchResponse.json();
      expect(patchResponseBody).toEqual({
        name: "ValidationError",
        message: "E-mail not Allowed",
        action: "Use a different email address",
        status_code: 400,
      });
    });
    test("with unique email", async () => {
      const testUser = await orchestrator.createUser({
        email: "Teste1@unique.com",
      });
      const testSession = await orchestrator.createSession(testUser.id);
      const patchResponse = await patchUserRequest(
        "teste1@unique.com",
        {
          email: "another@unique.com",
        },
        testSession,
      );
      expect(patchResponse.status).toBe(200);

      const patchResponseBody = await patchResponse.json();

      expect(patchResponseBody).toEqual({
        id: patchResponseBody.id,
        name: patchResponseBody.name,
        email: "another@unique.com",
        password: patchResponseBody.password,
        created_date: patchResponseBody.created_date,
        updated_date: patchResponseBody.updated_date,
      });
      expect(uuidVersion(patchResponseBody.id)).toBe(4);
      expect(Date.parse(patchResponseBody.created_date)).not.toBeNaN();
      expect(Date.parse(patchResponseBody.updated_date)).not.toBeNaN();
      expect(
        patchResponseBody.updated_date > patchResponseBody.created_date,
      ).toBe(true);
    });
    test("with changing Name", async () => {
      const nameChangeTest = await orchestrator.createUser({
        name: "Just A. Name",
      });
      const testSession = await orchestrator.createSession(nameChangeTest.id);
      const patchResponse = await patchUserRequest(
        nameChangeTest.email,
        {
          name: "Another Name",
        },
        testSession,
      );
      expect(patchResponse.status).toBe(200);

      const patchResponseBody = await patchResponse.json();

      expect(patchResponseBody).toEqual({
        id: patchResponseBody.id,
        name: "Another Name",
        email: nameChangeTest.email,
        password: patchResponseBody.password,
        created_date: patchResponseBody.created_date,
        updated_date: patchResponseBody.updated_date,
      });
      expect(uuidVersion(patchResponseBody.id)).toBe(4);
      expect(Date.parse(patchResponseBody.created_date)).not.toBeNaN();
      expect(Date.parse(patchResponseBody.updated_date)).not.toBeNaN();
      expect(
        patchResponseBody.updated_date > patchResponseBody.created_date,
      ).toBe(true);
    });
    test("with new Password", async () => {
      const newPasswordTest = await orchestrator.createUser({
        password: "OriginalPassword",
      });

      const testSession = await orchestrator.createSession(newPasswordTest.id);
      const patchResponse = await patchUserRequest(
        newPasswordTest.email,
        {
          password: "NewPassword",
        },
        testSession,
      );
      expect(patchResponse.status).toBe(200);

      const patchResponseBody = await patchResponse.json();

      expect(patchResponseBody).toEqual({
        id: patchResponseBody.id,
        name: newPasswordTest.name,
        email: newPasswordTest.email,
        password: patchResponseBody.password,
        created_date: patchResponseBody.created_date,
        updated_date: patchResponseBody.updated_date,
      });
      expect(uuidVersion(patchResponseBody.id)).toBe(4);
      expect(Date.parse(patchResponseBody.created_date)).not.toBeNaN();
      expect(Date.parse(patchResponseBody.updated_date)).not.toBeNaN();
      expect(
        patchResponseBody.updated_date > patchResponseBody.created_date,
      ).toBe(true);

      const userFromDatabase = await user.findUserDataByEmail(
        newPasswordTest.email,
      );
      const passwordMatch = await password.compare(
        "NewPassword",
        userFromDatabase.password,
      );
      expect(passwordMatch).toBe(true);

      const passwordMissmatch = await password.compare(
        "OriginalPassword",
        userFromDatabase.password,
      );
      expect(passwordMissmatch).toBe(false);
    });
  });
});

async function patchUserRequest(currentEmail, userProps, sessionObject) {
  return await fetch(`http://localhost:3000/api/v1/users/${currentEmail}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${sessionObject.token}`,
    },

    body: JSON.stringify({ ...userProps }),
  });
}
