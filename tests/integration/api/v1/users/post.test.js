import orchestrator from "tests/orchestrator";
import database from "infra/database";
import { version as uuidVersion } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST to /api/v1/users", () => {
  describe("Anonymous User", () => {
    test("with unique and valid data", async () => {
      const users = await database.query("select * from users;");
      console.log(users.rows);
      const response = await fetch("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "teste1",
          email: "teste1@teste.com",
          password: "teste123",
        }),
      });
      expect(response.status).toBe(201);

      const users2 = await database.query("select * from users;");
      console.log(users2.rows);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: responseBody.id,
        name: "teste1",
        email: "teste1@teste.com",
        password: "teste123",
        created_date: responseBody.created_date,
        updated_date: responseBody.updated_date,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(Date.parse(responseBody.created_date)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_date)).not.toBeNaN();
    });
  });
});
