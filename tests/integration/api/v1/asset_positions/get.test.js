import orchestrator from "tests/orchestrator";
import { version as uuidVersion } from "uuid";
import setCookieParser from "set-cookie-parser";
import Decimal from "decimal.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET to /api/v1/asset_positions", () => {
  describe("Anonymous User", () => {
    test("with no session", async () => {
      const getResponse = await getAssetPositionsRequest({});
      expect(getResponse.status).toBe(401);

      const getResponseBody = await getResponse.json();
      expect(getResponseBody).toEqual({
        name: "UnauthorizedError",
        message: "Unable to Find a Valid Session",
        action: "Please, review session information",
        status_code: 401,
      });
    });
    test("with invalid session", async () => {
      const invalidSession = {
        token:
          "3e5b70f82f559ef2b3596d291548f1e25f2ffb42c645b71cb7fb6b220f432482e8c6fd50be7baefb9ab2aab991d1f841",
      };
      const getResponse = await getAssetPositionsRequest(invalidSession);

      expect(getResponse.status).toBe(401);

      const getResponseBody = await getResponse.json();
      expect(getResponseBody).toEqual({
        name: "UnauthorizedError",
        message: "Unable to Find a Valid Session",
        action: "Please, review session information",
        status_code: 401,
      });
      // Set-Cookie assertions
      const parsedSetCookie = setCookieParser(getResponse, {
        map: true,
      });

      expect(parsedSetCookie.session_id).toEqual({
        name: "session_id",
        value: "invalid",
        maxAge: -1,
        path: "/",
        httpOnly: true,
      });
    });
  });
  describe("Defined User", () => {
    test("with a valid BUY transactions", async () => {
      const randTransaction = await orchestrator.createRandTransaction({
        transaction_type_key: "BUY",
      });

      const testSession = await orchestrator.createSession(
        randTransaction.user_id,
      );

      const getResponse = await getAssetPositionsRequest(testSession);

      expect(getResponse.status).toBe(200);

      const getResponseBody = await getResponse.json();

      const [assetPosition] = getResponseBody;

      // Transaction 1:
      expect(uuidVersion(assetPosition.id)).toBe(4);
      expect(assetPosition.user_id).toBe(randTransaction.user_id);
      expect(assetPosition.asset_id).toBe(randTransaction.asset_id);
      expect(assetPosition.quantity).toBe(randTransaction.quantity);
      expect(
        new Decimal(assetPosition.total_cost).equals(
          new Decimal(randTransaction.quantity).times(
            new Decimal(randTransaction.unit_price),
          ),
        ),
      ).toBe(true);
      expect(assetPosition.avg_cost).toBe(randTransaction.unit_price);

      expect(Date.parse(assetPosition.created_date)).not.toBeNaN();
      expect(Date.parse(assetPosition.updated_date)).not.toBeNaN();
    });
    test("with 2 valid transactions (BUY, INCOME) for the same asset", async () => {
      const testUser = await orchestrator.createUser({});
      const testAsset = await orchestrator.createUserAsset({}, testUser.id);
      const buyTransaction = await orchestrator.createRandTransaction({
        testUser,
        testAsset,
        transaction_type_key: "BUY",
      });

      const incomeTransaction = await orchestrator.createRandTransaction({
        testUser,
        testAsset,
        transaction_type_key: "INCOME",
      });

      const testSession = await orchestrator.createSession(testUser.id);

      const getResponse = await getAssetPositionsRequest(testSession);

      expect(getResponse.status).toBe(200);

      const getResponseBody = await getResponse.json();

      const assetPositionList = getResponseBody;

      expect(assetPositionList.length).toEqual(1);

      const [assetPosition] = assetPositionList;
      console.log(assetPosition);
      expect(uuidVersion(assetPosition.id)).toBe(4);
      expect(assetPosition.user_id).toBe(buyTransaction.user_id);
      expect(assetPosition.asset_id).toBe(buyTransaction.asset_id);
      expect(assetPosition.quantity).toBe(buyTransaction.quantity);
      expect(
        new Decimal(assetPosition.total_cost).equals(
          new Decimal(buyTransaction.quantity).times(
            new Decimal(buyTransaction.unit_price),
          ),
        ),
      ).toBe(true);
      expect(assetPosition.avg_cost).toBe(buyTransaction.unit_price);
      expect(
        // yield = t.quantity * t.price
        new Decimal(assetPosition.yield).equals(
          new Decimal(incomeTransaction.quantity).times(
            new Decimal(incomeTransaction.unit_price),
          ),
        ),
      ).toBe(true);

      expect(Date.parse(assetPosition.created_date)).not.toBeNaN();
      expect(Date.parse(assetPosition.updated_date)).not.toBeNaN();
      expect(assetPosition.updated_date > assetPosition.created_date).toBe(
        true,
      );
    });
  });
});

async function getAssetPositionsRequest(sessionObject) {
  return await fetch(`http://localhost:3000/api/v1/asset_positions`, {
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${sessionObject.token}`,
    },
  });
}
