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
      const user1Response = await postCreateUserRequest({
        name: "Original Email",
        email: "Teste1@original.com",
        password: "teste123",
      });
      expect(user1Response.status).toBe(201);

      const user2Response = await postCreateUserRequest({
        name: "Second Email",
        email: "Teste1@second.com",
        password: "teste123",
      });
      expect(user2Response.status).toBe(201);

      const patchResponse = await patchUserRequest("Teste1@second.com", {
        email: "Teste1@original.com",
      });
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
      const user1Response = await postCreateUserRequest({
        name: "Unique Email",
        email: "Teste1@unique.com",
        password: "teste123",
      });
      expect(user1Response.status).toBe(201);

      const patchResponse = await patchUserRequest("teste1@unique.com", {
        email: "another@unique.com",
      });
      expect(patchResponse.status).toBe(200);

      const patchResponseBody = await patchResponse.json();

      expect(patchResponseBody).toEqual({
        id: patchResponseBody.id,
        name: "Unique Email",
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
      const user1Response = await postCreateUserRequest({
        name: "Just A. Name",
        email: "changing_name@test.com",
        password: "teste123",
      });
      expect(user1Response.status).toBe(201);

      const patchResponse = await patchUserRequest("changing_name@test.com", {
        name: "Another Name",
      });
      expect(patchResponse.status).toBe(200);

      const patchResponseBody = await patchResponse.json();

      expect(patchResponseBody).toEqual({
        id: patchResponseBody.id,
        name: "Another Name",
        email: "changing_name@test.com",
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
      const user1Response = await postCreateUserRequest({
        name: "Password Update",
        email: "password_update@test.com",
        password: "OriginalPassword",
      });
      expect(user1Response.status).toBe(201);

      const patchResponse = await patchUserRequest("changing_name@test.com", {
        password: "NewPassword",
      });
      expect(patchResponse.status).toBe(200);

      const patchResponseBody = await patchResponse.json();

      expect(patchResponseBody).toEqual({
        id: patchResponseBody.id,
        name: "Another Name",
        email: "changing_name@test.com",
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
        "changing_name@test.com",
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

async function patchUserRequest(currentEmail, userProps) {
  return await fetch(`http://localhost:3000/api/v1/users/${currentEmail}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({ ...userProps }),
  });
}

async function postCreateUserRequest(userProps) {
  return await fetch("http://localhost:3000/api/v1/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: userProps.name,
      email: userProps.email,
      password: userProps.password,
    }),
  });
}
