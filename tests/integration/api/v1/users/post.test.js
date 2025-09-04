import orchestrator from "tests/orchestrator";
import { version as uuidVersion } from "uuid";
import user from "model/user.js";
import password from "model/password.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST to /api/v1/users", () => {
  describe("Anonymous User", () => {
    test("With Empty data", async () => {
      const emptyUserResponse = await postCreateUserRequest({
        name: "",
        email: "teste1@teste.com",
        password: "teste123",
      });
      expect(emptyUserResponse.status).toBe(400);

      const responseBody = await emptyUserResponse.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "[name] Cannot be empty nor null",
        action: "Please review submitted data",
        status_code: 400,
      });
    });
    test("With Null data", async () => {
      const nullUserResponse = await postCreateUserRequest({
        name: null,
        email: null,
        password: "teste123",
      });
      expect(nullUserResponse.status).toBe(400);

      const responseBody = await nullUserResponse.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "[name,email] Cannot be empty nor null",
        action: "Please review submitted data",
        status_code: 400,
      });
    });
    test("with unique and valid data", async () => {
      const response = await postCreateUserRequest({
        name: "teste1",
        email: "teste1@teste.com",
        password: "teste123",
      });
      expect(response.status).toBe(201);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        name: "teste1",
        email: "teste1@teste.com",
        password: responseBody.password,
        created_date: responseBody.created_date,
        updated_date: responseBody.updated_date,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_date)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_date)).not.toBeNaN();

      const userFromDatabase =
        await user.findUserDataByEmail("teste1@teste.com");
      const passwordMatch = await password.compare(
        "teste123",
        userFromDatabase.password,
      );
      expect(passwordMatch).toBe(true);

      const passwordMissmatch = await password.compare(
        "wrongPassword",
        userFromDatabase.password,
      );
      expect(passwordMissmatch).toBe(false);
    });
    test("with duplicated email", async () => {
      const response = await postCreateUserRequest({
        name: "Duplicated User",
        email: "Teste1@teste.com",
        password: "teste123",
      });

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "E-mail not Allowed",
        action: "Use a different email address",
        status_code: 400,
      });
    });
  });
});

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
