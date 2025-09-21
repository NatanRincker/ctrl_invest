import orchestrator from "tests/orchestrator";
import { version as uuidVersion } from "uuid";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET to /api/v1/users/[email]", () => {
  describe("Anonymous User", () => {
    test("with no session", async () => {
      const randTransaction = await orchestrator.createRandTransaction({});

      const getResponse = await getTransactionRequest(
        randTransaction.asset_id,
        {},
      );

      expect(getResponse.status).toBe(401);

      const getResponseBody = await getResponse.json();
      expect(getResponseBody).toEqual({
        name: "UnauthorizedError",
        message: "Unable to Find a Valid Session",
        action: "Please, review session information",
        status_code: 401,
      });
    });
  });
  describe("Defined User", () => {
    test("with 2 valid transactions for the same asset", async () => {
      const testUser = await orchestrator.createUser({});
      const testAsset = await orchestrator.createUserAsset({}, testUser.id);
      const firstTransaction = await orchestrator.createRandTransaction({
        testUser: testUser,
        testAsset: testAsset,
      });
      const scndTransaction = await orchestrator.createRandTransaction({
        testUser: testUser,
        testAsset: testAsset,
      });
      const testSession = await orchestrator.createSession(testUser.id);
      const getResponse = await getTransactionRequest(
        testAsset.id,
        testSession,
      );

      expect(getResponse.status).toBe(200);

      const getResponseBody = await getResponse.json();

      const [t1, t2] = getResponseBody;

      // Transaction 1:
      expect(uuidVersion(t1.id)).toBe(4);
      expect(t1.user_id).toBe(testUser.id);
      expect(t1.asset_id).toBe(testAsset.id);
      expect(t1.transaction_type_key).toBe(
        firstTransaction.transaction_type_key,
      );
      expect(t1.description).toBe(firstTransaction.description);
      expect(t1.currency_code).toBe(firstTransaction.currency_code);
      expect(Date.parse(t1.occurred_date)).not.toBeNaN();
      expect(Date.parse(t1.created_date)).not.toBeNaN();
      expect(Date.parse(t1.updated_date)).not.toBeNaN();

      // Transaction 2:
      expect(uuidVersion(t2.id)).toBe(4);
      expect(t2.user_id).toBe(testUser.id);
      expect(t2.asset_id).toBe(testAsset.id);
      expect(t2.transaction_type_key).toBe(
        scndTransaction.transaction_type_key,
      );
      expect(t2.description).toBe(scndTransaction.description);
      expect(t2.currency_code).toBe(scndTransaction.currency_code);
      expect(Date.parse(t2.occurred_date)).not.toBeNaN();
      expect(Date.parse(t2.created_date)).not.toBeNaN();
      expect(Date.parse(t2.updated_date)).not.toBeNaN();
    });
    test("with invalid asset_id", async () => {
      const userX = await orchestrator.createUser({});
      const assetX = await orchestrator.createUserAsset({}, userX.id);
      //creating transaction against rand user and rand asset
      const transactionY = await orchestrator.createRandTransaction({});
      const sessionY = await orchestrator.createSession(transactionY.user_id);

      const getResponse = await getTransactionRequest(assetX.id, sessionY);
      expect(getResponse.status).toBe(401);

      const getResponseBody = await getResponse.json();
      expect(getResponseBody).toEqual({
        message: "Asset and User are not related",
        action: "Please, check if asset_id and user_id are correct",
        name: "UnauthorizedError",
        status_code: 401,
      });
    });
  });
});

async function getTransactionRequest(asset_id, sessionObject) {
  console.log("asset_id");
  console.log(asset_id);
  return await fetch(
    `http://localhost:3000/api/v1/transactions/asset_id/${asset_id}`,
    {
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionObject.token}`,
      },
    },
  );
}
