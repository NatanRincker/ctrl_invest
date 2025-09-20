import orchestrator from "tests/orchestrator";
import { version as uuidVersion } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE to /api/v1/assets", () => {
  describe("Defined User", () => {
    test("with unique data", async () => {
      const testTransaction = await orchestrator.createRandTransaction({});
      const testSession = await orchestrator.createSession(
        testTransaction.user_id,
      );

      const deleteResponse = await deleteTransactionRequest(
        testTransaction.id,
        testSession,
      );
      expect(deleteResponse.status).toBe(200);

      const deleteResponseBody = await deleteResponse.json();

      expect(deleteResponseBody).toEqual({
        id: testTransaction.id,
        user_id: testTransaction.user_id,
        asset_id: testTransaction.asset_id,
        transaction_type_key: testTransaction.transaction_type_key,
        quantity: testTransaction.quantity.toString(),
        unit_price: testTransaction.unit_price.toString(),
        description: testTransaction.description,
        currency_code: testTransaction.currency_code,
        occurred_date: new Date(testTransaction.occurred_date).toISOString(),
        created_date: deleteResponseBody.created_date,
        updated_date: deleteResponseBody.updated_date,
      });
      expect(uuidVersion(deleteResponseBody.id)).toBe(4);
      expect(Date.parse(deleteResponseBody.created_date)).not.toBeNaN();
      expect(Date.parse(deleteResponseBody.updated_date)).not.toBeNaN();
    });
  });
  describe("Anonimous user Session", () => {
    test("with unique and valid data", async () => {
      const testTransaction = await orchestrator.createRandTransaction({});

      const response = await deleteTransactionRequest(testTransaction.id, {});
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

async function deleteTransactionRequest(transactionId, sessionObject) {
  const submitData = { id: transactionId };

  console.log("submitData");
  console.log(submitData);
  return await fetch(`http://localhost:3000/api/v1/transactions`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${sessionObject.token}`,
    },

    body: JSON.stringify(submitData),
  });
}
