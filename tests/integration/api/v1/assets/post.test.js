import orchestrator from "tests/orchestrator";
import { version as uuidVersion } from "uuid";
import { faker } from "@faker-js/faker/.";
beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST to /api/v1/assets", () => {
  describe("Defined Session", () => {
    test("With incomplete data", async () => {
      const assetTestUser = await orchestrator.createUser({});
      const assetTestSession = await orchestrator.createSession(
        assetTestUser.id,
      );

      const randomAssetType = await orchestrator.getRandomAssetType();
      const emptyAssetResponse = await postCreateUserRequest(
        {
          code: "",
          name: "Test Name",
          description: "",
          currency_code: faker.finance.currencyCode(),
          market_value: faker.number.float({ fractionDigits: 8 }),
          paid_price: null,
          yfinance_compatible: true,
          is_generic: true,
          asset_type_code: randomAssetType.code,
        },
        assetTestSession,
      );
      expect(emptyAssetResponse.status).toBe(400);

      const responseBody = await emptyAssetResponse.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "[code,paid_price] Cannot be empty nor null",
        action: "Please review submitted data",
        status_code: 400,
      });
    });
    test("With invalid market_price", async () => {
      const assetTestUser = await orchestrator.createUser({});
      const assetTestSession = await orchestrator.createSession(
        assetTestUser.id,
      );

      const randomAssetType = await orchestrator.getRandomAssetType();
      const invalidMktPriceResponse = await postCreateUserRequest(
        {
          code: "wadavasd",
          name: "Whathever Name",
          description: "asdadaf",
          currency_code: "USD",
          market_value: faker.number.float({ fractionDigits: 9 }),
          paid_price: faker.number.float({ fractionDigits: 8 }),
          yfinance_compatible: true,
          is_generic: true,
          asset_type_code: randomAssetType.code,
        },
        assetTestSession,
      );
      expect(invalidMktPriceResponse.status).toBe(400);

      const responseBody = await invalidMktPriceResponse.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "[market_value] exceeds the supported fractional amount",
        action: "Please review submitted data",
        status_code: 400,
      });
    });
    test.only("with unique and valid data", async () => {
      const assetTestUser = await orchestrator.createUser({});
      const assetTestSession = await orchestrator.createSession(
        assetTestUser.id,
      );

      const randomAssetType = await orchestrator.getRandomAssetType();
      const validAssetResponse = await postCreateUserRequest(
        {
          code: "TEST_CODE_GG",
          name: "Test Asset GG",
          description: "asdadaf",
          currency_code: "BRL",
          market_value: 35.74,
          paid_price: 1000,
          yfinance_compatible: true,
          is_generic: false,
          asset_type_code: randomAssetType.code,
        },
        assetTestSession,
      );
      expect(validAssetResponse.status).toBe(201);

      const responseBody = await validAssetResponse.json();
      expect(responseBody.user_id).toBe(assetTestUser.id);

      expect(Date.parse(responseBody.created_date)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_date)).not.toBeNaN();
    });
    test("with duplicated ...", async () => {
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
  describe("Undefined Session", () => {});
});

async function postCreateUserRequest(assetProps, sessionObject) {
  return await fetch("http://localhost:3000/api/v1/assets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${sessionObject.token}`,
    },
    body: JSON.stringify({
      code: assetProps.code,
      name: assetProps.name,
      description: assetProps.description,
      currency_code: assetProps.currency_code,
      market_value: assetProps.market_value,
      paid_price: assetProps.paid_price,
      yfinance_compatible: assetProps.yfinance_compatible,
      is_generic: assetProps.is_generic,
      asset_type_code: assetProps.asset_type_code,
    }),
  });
}
