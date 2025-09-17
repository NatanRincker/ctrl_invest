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
      const testUser = await orchestrator.createUser({});
      const testSession = await orchestrator.createSession(testUser.id);

      const originalAsset = await orchestrator.createUserAsset({}, testUser.id);
      console.log(originalAsset);
      const patchResponse = await patchAssetRequest(
        originalAsset.id,
        {
          name: "New Asset Name",
          paid_price: "150.53",
        },
        testSession,
      );
      expect(patchResponse.status).toBe(200);

      const patchResponseBody = await patchResponse.json();

      expect(patchResponseBody).toEqual({
        id: originalAsset.id,
        code: originalAsset.code,
        name: "New Asset Name",
        description: originalAsset.description,
        currency_code: originalAsset.currency_code,
        market_value: originalAsset.market_value,
        paid_price: "150.53000000",
        yfinance_compatible: originalAsset.yfinance_compatible,
        is_generic: originalAsset.is_generic,
        asset_type_code: originalAsset.asset_type_code,
        created_date: patchResponseBody.created_date,
        user_id: originalAsset.user_id,
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

async function patchAssetRequest(assetId, assetProps, sessionObject) {
  console.log("patchAssetRequest > assetId");
  console.log(assetId);
  return await fetch(`http://localhost:3000/api/v1/assets`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${sessionObject.token}`,
    },

    body: JSON.stringify({ id: assetId, ...assetProps }),
  });
}
