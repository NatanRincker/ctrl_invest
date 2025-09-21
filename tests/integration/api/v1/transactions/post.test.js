import orchestrator from "tests/orchestrator";
import { version as uuidVersion } from "uuid";
import setCookieParser from "set-cookie-parser";
import { faker } from "@faker-js/faker/.";
beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST to /api/v1/transactions", () => {
  describe("Defined Session", () => {
    test("With incomplete data", async () => {
      const testUser = await orchestrator.createUser({});
      const assetTestSession = await orchestrator.createSession(testUser.id);
      const testAsset = await orchestrator.createUserAsset({}, testUser.id);
      const randTransactionType = await orchestrator.getRandomTransactionType();
      const response = await postCreateUserRequest(
        {
          user_id: testUser.id,
          asset_id: testAsset.id,
          transaction_type_key: randTransactionType.key,
          quantity: faker.number.int({ min: 1, max: 1000000000 }).toString(),
          unit_price: faker.number.float({ fractionDigits: 8 }).toString(),
          description: "",
          currency_code: "",
          occurred_date: "",
        },
        assetTestSession,
      );
      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "[currency_code] Cannot be empty nor null",
        action: "Please review submitted data",
        status_code: 400,
      });
    });
    test("With invalid unit_price", async () => {
      const testUser = await orchestrator.createUser({});
      const assetTestSession = await orchestrator.createSession(testUser.id);
      const testAsset = await orchestrator.createUserAsset({}, testUser.id);
      const randTransactionType = await orchestrator.getRandomTransactionType();
      const response = await postCreateUserRequest(
        {
          user_id: testUser.id,
          asset_id: testAsset.id,
          transaction_type_key: randTransactionType.key,
          quantity: faker.number.int({ min: 1, max: 1000000000 }).toString(),
          unit_price: faker.number.float({ fractionDigits: 11 }).toString(),
          description: "test_description",
          currency_code: "USD",
          occurred_date: new Date(Date.now()).toISOString(),
        },
        assetTestSession,
      );
      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "[unit_price] exceeds the supported fractional amount",
        action: "Please review submitted data",
        status_code: 400,
      });
    });
    test("With invalid occured_date", async () => {
      const testUser = await orchestrator.createUser({});
      const assetTestSession = await orchestrator.createSession(testUser.id);
      const testAsset = await orchestrator.createUserAsset({}, testUser.id);
      const randTransactionType = await orchestrator.getRandomTransactionType();
      const randInvalidOccuredDate = getRandomElement([
        "not_valid",
        12341,
        true,
      ]);
      const response = await postCreateUserRequest(
        {
          user_id: testUser.id,
          asset_id: testAsset.id,
          transaction_type_key: randTransactionType.key,
          quantity: faker.number.int({ min: 1, max: 1000000000 }).toString(),
          unit_price: faker.number.float({ fractionDigits: 8 }).toString(),
          description: "test_description",
          currency_code: "BRL",
          occurred_date: randInvalidOccuredDate,
        },
        assetTestSession,
      );
      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "ValidationError",
        message: "[occurred_date] is not Valid",
        action: "Please review submitted data",
        status_code: 400,
      });
    });
    test("With invalid currency_code", async () => {
      const testUser = await orchestrator.createUser({});
      const assetTestSession = await orchestrator.createSession(testUser.id);
      const testAsset = await orchestrator.createUserAsset({}, testUser.id);
      const randTransactionType = await orchestrator.getRandomTransactionType();

      const response = await postCreateUserRequest(
        {
          user_id: testUser.id,
          asset_id: testAsset.id,
          transaction_type_key: randTransactionType.key,
          quantity: faker.number.int({ min: 1, max: 1000000000 }).toString(),
          unit_price: faker.number.float({ fractionDigits: 8 }).toString(),
          description: "test_description",
          currency_code: "XXX",
          occurred_date: "",
        },
        assetTestSession,
      );
      expect(response.status).toBe(404);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "Currency Not Found",
        action: "Please, check if the Currency code is correct",
        status_code: 404,
      });
    });
    test("With invalid asset_id", async () => {
      const testUser = await orchestrator.createUser({});
      const assetTestSession = await orchestrator.createSession(testUser.id);
      const randTransactionType = await orchestrator.getRandomTransactionType();

      const response = await postCreateUserRequest(
        {
          user_id: testUser.id,
          asset_id: testUser.id,
          transaction_type_key: randTransactionType.key,
          quantity: faker.number.int({ min: 1, max: 1000000000 }).toString(),
          unit_price: faker.number.float({ fractionDigits: 8 }).toString(),
          description: "test_description",
          currency_code: "BRL",
          occurred_date: "",
        },
        assetTestSession,
      );
      expect(response.status).toBe(401);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Asset and User are not related",
        action: "Please, check if asset_id and user_id are correct",
        status_code: 401,
      });
    });
    test("With invalid user_id", async () => {
      const testUser = await orchestrator.createUser({});
      const assetTestSession = await orchestrator.createSession(testUser.id);
      const testAsset = await orchestrator.createUserAsset({}, testUser.id);
      const randTransactionType = await orchestrator.getRandomTransactionType();

      const response = await postCreateUserRequest(
        {
          user_id: testAsset.id,
          asset_id: testAsset.id,
          transaction_type_key: randTransactionType.key,
          quantity: faker.number.int({ min: 1, max: 1000000000 }).toString(),
          unit_price: faker.number.float({ fractionDigits: 8 }).toString(),
          description: "test_description",
          currency_code: "USD",
          occurred_date: null,
        },
        assetTestSession,
      );
      expect(response.status).toBe(401);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Asset and User are not related",
        action: "Please, check if asset_id and user_id are correct",
        status_code: 401,
      });
    });
    test("with unique and valid data", async () => {
      const testUser = await orchestrator.createUser({});
      const validtestSession = await orchestrator.createSession(testUser.id);
      const testAsset = await orchestrator.createUserAsset({}, testUser.id);
      const randTransactionType = await orchestrator.getRandomTransactionType();
      const randCurrency = await orchestrator.getRandomCurrency();
      const randOccuredDate = getRandomElement([
        "",
        null,
        new Date(Date.now()).toISOString(),
      ]);

      const response = await postCreateUserRequest(
        {
          user_id: testUser.id,
          asset_id: testAsset.id,
          transaction_type_key: randTransactionType.key,
          quantity: faker.number.int({ min: 1, max: 1000000000 }).toString(),
          unit_price: faker.number
            .float({ max: 1000000000, fractionDigits: 8 })
            .toString(),
          description: "test_description",
          currency_code: randCurrency.code,
          occurred_date: randOccuredDate,
        },
        validtestSession,
      );
      const responseBody = await response.json();
      expect(response.status).toBe(201);

      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(responseBody.user_id).toBe(testUser.id);
      expect(responseBody.asset_id).toBe(testAsset.id);
      expect(responseBody.transaction_type_key).toBe(randTransactionType.key);
      expect(responseBody.description).toBe("test_description");
      expect(responseBody.currency_code).toBe(randCurrency.code);
      expect(Date.parse(responseBody.occurred_date)).not.toBeNaN();
      expect(Date.parse(responseBody.created_date)).not.toBeNaN();
      expect(Date.parse(responseBody.updated_date)).not.toBeNaN();
    });
    test("with invalid session", async () => {
      const invalidSession = {
        token:
          "3e5b70f82f559ef2b3596d291548f1e25f2ffb42c645b71cb7fb6b220f432482e8c6fd50be7baefb9ab2aab991d1f841",
      };
      const testUser = await orchestrator.createUser({});
      const testAsset = await orchestrator.createUserAsset({}, testUser.id);
      const randTransactionType = await orchestrator.getRandomTransactionType();
      const randCurrency = await orchestrator.getRandomCurrency();
      const randOccuredDate = getRandomElement([
        "",
        null,
        new Date(Date.now()).toISOString(),
      ]);

      const response = await postCreateUserRequest(
        {
          user_id: testUser.id,
          asset_id: testAsset.id,
          transaction_type_key: randTransactionType.key,
          quantity: faker.number.int({ min: 1, max: 1000000000 }).toString(),
          unit_price: faker.number.float({ fractionDigits: 8 }).toString(),
          description: "test_description",
          currency_code: randCurrency.code,
          occurred_date: randOccuredDate,
        },
        invalidSession,
      );
      expect(response.status).toBe(401);

      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "UnauthorizedError",
        message: "Unable to Find a Valid Session",
        action: "Please, review session information",
        status_code: 401,
      });

      // Set-Cookie assertions
      const parsedSetCookie = setCookieParser(response, {
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
      const testUser = await orchestrator.createUser({});
      const testAsset = await orchestrator.createUserAsset({}, testUser.id);
      const randTransactionType = await orchestrator.getRandomTransactionType();
      const randCurrency = await orchestrator.getRandomCurrency();
      const randOccuredDate = getRandomElement([
        "",
        null,
        new Date(Date.now()).toISOString(),
      ]);

      const response = await postCreateUserRequest(
        {
          user_id: testUser.id,
          asset_id: testAsset.id,
          transaction_type_key: randTransactionType.key,
          quantity: faker.number.int({ min: 1, max: 1000000000 }).toString(),
          unit_price: faker.number.float({ fractionDigits: 8 }).toString(),
          description: "test_description",
          currency_code: randCurrency.code,
          occurred_date: randOccuredDate,
        },
        {},
      );
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

async function postCreateUserRequest(transactionProps, sessionObject) {
  return await fetch("http://localhost:3000/api/v1/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${sessionObject.token}`,
    },
    body: JSON.stringify({
      user_id: transactionProps.user_id,
      asset_id: transactionProps.asset_id,
      transaction_type_key: transactionProps.transaction_type_key,
      quantity: transactionProps.quantity,
      unit_price: transactionProps.unit_price,
      description: transactionProps.description,
      currency_code: transactionProps.currency_code,
      occurred_date: transactionProps.occurred_date,
    }),
  });
}

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
