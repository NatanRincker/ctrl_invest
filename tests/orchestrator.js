import retry from "async-retry";
import database from "infra/database";
import migrator from "model/migrator";
import user from "model/user";
import { faker } from "@faker-js/faker/.";
import session from "model/session";
import asset_type from "model/asset_type";
import currency from "model/currency";
import asset from "model/asset";
import transaction from "model/transaction";
import asset_position from "model/asset_position";

async function waitForAllServices() {
  await waitForWebServer();
  async function waitForWebServer() {
    return retry(fetchStatusPage, {
      retries: 100,
      maxTimeout: 5000,
    });
    async function fetchStatusPage() {
      const response = await fetch("http://localhost:3000/api/v1/status");
      if (response.status != 200) {
        throw Error();
      }
    }
  }
}

async function clearDatabase() {
  await database.query("drop schema public cascade; create schema public;");
}

async function runPendingMigrations() {
  await migrator.runPendingMigrations();
}

async function createUser(userInputData) {
  return await user.create({
    email: userInputData.email || faker.internet.email(),
    name: userInputData.name || faker.person.fullName(),
    password: userInputData.password || "V@lidPassw0rd!",
  });
}

async function createSession(userId) {
  return await session.create(userId);
}

async function createUserAsset(assetInputData, userId) {
  const currency_code =
    assetInputData.currency_code || (await getRandomCurrency()).code;
  const asset_type_code =
    assetInputData.asset_type_code || (await getRandomAssetType()).code;

  const market_value =
    assetInputData.market_value ||
    faker.number.float({ fractionDigits: 8 }).toString();

  const paid_price =
    assetInputData.paid_price ||
    faker.number.float({ fractionDigits: 8 }).toString();

  return await asset.createUserAsset(
    {
      code:
        assetInputData.code ||
        faker.string.alphanumeric({ length: { min: 1, max: 64 } }),
      name: assetInputData.name || "Test Asset GG",
      description: assetInputData.description || "This is A Test Description",
      currency_code,
      market_value,
      paid_price,
      yfinance_compatible:
        assetInputData.yfinance_compatible || faker.datatype.boolean(),
      is_generic: assetInputData.is_generic || faker.datatype.boolean(),
      asset_type_code,
    },
    userId,
  );
}

async function getUserAssetPositions(user_id) {
  try {
    return await asset_position.getUserAssetPositions(user_id);
  } catch (e) {
    return e;
  }
}

async function createRandTransaction(inputData) {
  const testUser = inputData.testUser || (await createUser({}));
  const testAsset =
    inputData.testAsset || (await createUserAsset({}, testUser.id));
  const randTransactionTypeKey =
    inputData.transaction_type_key || (await getRandomTransactionType()).key;
  const randCurrency = await getRandomCurrency();
  const randOccuredDate = getRandomElement([
    "",
    null,
    new Date(Date.now()).toISOString(),
  ]);

  const quantity =
    inputData.transaction_quantity ||
    faker.number.int({ min: 1, max: 99_999 }).toString();
  const unit_price =
    inputData.transaction_unit_price ||
    faker.number.float({ max: 999_999, fractionDigits: 8 }).toString();

  return await transaction.create({
    user_id: testUser.id,
    asset_id: testAsset.id,
    transaction_type_key: randTransactionTypeKey,
    quantity: quantity,
    unit_price: unit_price,
    description: "test_description",
    currency_code: randCurrency.code,
    occurred_date: randOccuredDate,
  });
}

async function getRandomAssetType() {
  const assetTypeList = await asset_type.findAllAvailableOptions();
  return getRandomElement(assetTypeList);
}

async function getRandomCurrency() {
  const currencyList = await currency.findAllAvailableOptions();
  return getRandomElement(currencyList);
}

async function getRandomTransactionType() {
  const currencyList = await transaction.getAvailableTransactionTypes();
  return getRandomElement(currencyList);
}

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const orchestrator = {
  waitForAllServices,
  clearDatabase,
  runPendingMigrations,
  createUser,
  createSession,
  createUserAsset,
  createRandTransaction,
  getRandomAssetType,
  getRandomCurrency,
  getRandomTransactionType,
  getUserAssetPositions,
};

export default orchestrator;
