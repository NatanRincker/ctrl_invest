import orchestrator from "tests/orchestrator";
import { version as uuidVersion } from "uuid";
import setCookieParser from "set-cookie-parser";
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
          market_value: faker.number.float({ fractionDigits: 9 }).toString(),
          paid_price: faker.number.float({ fractionDigits: 8 }).toString(),
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
    test("With invalid currency_code", async () => {
      const assetTestUser = await orchestrator.createUser({});
      const assetTestSession = await orchestrator.createSession(
        assetTestUser.id,
      );

      const randomAssetType = await orchestrator.getRandomAssetType();
      const invalidMktPriceResponse = await postCreateUserRequest(
        {
          code: "wadavasd_currency_code",
          name: "Whathever Name for currency_code",
          description: "",
          currency_code: "XXX",
          market_value: "1342412",
          paid_price: faker.number.float({ fractionDigits: 8 }).toString(),
          yfinance_compatible: true,
          is_generic: true,
          asset_type_code: randomAssetType.code,
        },
        assetTestSession,
      );
      expect(invalidMktPriceResponse.status).toBe(404);

      const responseBody = await invalidMktPriceResponse.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "Currency Not Found",
        action: "Please, check if the Currency code is correct",
        status_code: 404,
      });
    });
    test("With invalid asset_type_code", async () => {
      const assetTestUser = await orchestrator.createUser({});
      const assetTestSession = await orchestrator.createSession(
        assetTestUser.id,
      );

      const randomCurrency = await orchestrator.getRandomCurrency();
      const invalidMktPriceResponse = await postCreateUserRequest(
        {
          code: "wadavasd_asset_type_code",
          name: "Whathever Name for asset_type_code",
          description: "",
          currency_code: randomCurrency.code,
          market_value: "1342412",
          paid_price: faker.number.float({ fractionDigits: 8 }).toString(),
          yfinance_compatible: true,
          is_generic: true,
          asset_type_code: "NOT_A_VALID_CODE",
        },
        assetTestSession,
      );
      expect(invalidMktPriceResponse.status).toBe(404);

      const responseBody = await invalidMktPriceResponse.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "Asset Type Not Found",
        action: "Please, check if the Asset Type is correct",
        status_code: 404,
      });
    });
    test("with unique and valid data", async () => {
      const assetTestUser = await orchestrator.createUser({});
      const assetTestSession = await orchestrator.createSession(
        assetTestUser.id,
      );

      const randomAssetType = await orchestrator.getRandomAssetType();
      const randomCurrency = await orchestrator.getRandomCurrency();
      const validAssetResponse = await postCreateUserRequest(
        {
          code: "TEST_CODE_GG",
          name: "Test Asset GG",
          description: "asdadaf",
          currency_code: randomCurrency.code,
          market_value: "35.74",
          paid_price: "1000",
          yfinance_compatible: true,
          is_generic: false,
          asset_type_code: randomAssetType.code,
        },
        assetTestSession,
      );
      expect(validAssetResponse.status).toBe(201);

      const responseBody = await validAssetResponse.json();
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(responseBody.user_id).toBe(assetTestUser.id);
      expect(Date.parse(responseBody.created_date)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_date)).not.toBeNaN();
    });
    test("with invalid  session", async () => {
      const invalidSession = {
        token:
          "3e5b70f82f559ef2b3596d291548f1e25f2ffb42c645b71cb7fb6b220f432482e8c6fd50be7baefb9ab2aab991d1f841",
      };

      const randomAssetType = await orchestrator.getRandomAssetType();
      const randomCurrency = await orchestrator.getRandomCurrency();
      const invalidSessionResponse = await postCreateUserRequest(
        {
          code: "TEST_CODE_GG",
          name: "Test Asset GG",
          description: "asdadaf",
          currency_code: randomCurrency.code,
          market_value: "35.74",
          paid_price: "1000",
          yfinance_compatible: true,
          is_generic: false,
          asset_type_code: randomAssetType.code,
        },
        invalidSession,
      );
      expect(invalidSessionResponse.status).toBe(401);

      const responseBody = await invalidSessionResponse.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Unable to Find a Valid Session",
        action: "Please, review session information",
        status_code: 401,
      });

      // Set-Cookie assertions
      const parsedSetCookie = setCookieParser(invalidSessionResponse, {
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
  describe("Undefined Session", () => {
    test("with unique and valid data", async () => {
      const randomAssetType = await orchestrator.getRandomAssetType();
      const randomCurrency = await orchestrator.getRandomCurrency();
      const noSessionResponse = await postCreateUserRequest(
        {
          code: "TEST_CODE_GG",
          name: "Test Asset GG",
          description: "asdadaf",
          currency_code: randomCurrency.code,
          market_value: "35.74",
          paid_price: "1000",
          yfinance_compatible: true,
          is_generic: false,
          asset_type_code: randomAssetType.code,
        },
        {}, //no session
      );
      expect(noSessionResponse.status).toBe(401);
      const responseBody = await noSessionResponse.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Unable to Find a Valid Session",
        action: "Please, review session information",
        status_code: 401,
      });
    });
  });
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
