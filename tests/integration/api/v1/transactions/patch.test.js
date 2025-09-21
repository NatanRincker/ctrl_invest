import orchestrator from "tests/orchestrator";
import { version as uuidVersion } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH to /api/v1/assets", () => {
  describe("Defined User", () => {
    test("with unique data", async () => {
      const testTransaction = await orchestrator.createRandTransaction({});
      const testSession = await orchestrator.createSession(
        testTransaction.user_id,
      );

      console.log(testTransaction);
      const patchResponse = await patchAssetRequest(
        testTransaction.id,
        {
          quantity: "10",
          unit_price: "150.53",
        },
        testSession,
      );
      expect(patchResponse.status).toBe(200);

      const patchResponseBody = await patchResponse.json();

      expect(patchResponseBody).toEqual({
        id: testTransaction.id,
        user_id: testTransaction.user_id,
        asset_id: testTransaction.asset_id,
        transaction_type_key: testTransaction.transaction_type_key,
        quantity: "10.00000000",
        unit_price: "150.53000000",
        description: testTransaction.description,
        currency_code: testTransaction.currency_code,
        occurred_date: new Date(testTransaction.occurred_date).toISOString(),
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
  });
});

async function patchAssetRequest(
  transactionId,
  transactionProps,
  sessionObject,
) {
  const submitData = { id: transactionId, ...transactionProps };
  console.log("patchAssetRequest > assetId");
  console.log(submitData);
  return await fetch(`http://localhost:3000/api/v1/transactions`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${sessionObject.token}`,
    },

    body: JSON.stringify(submitData),
  });
}
