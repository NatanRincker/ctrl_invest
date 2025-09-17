import retry from "async-retry";
import database from "infra/database";
import migrator from "model/migrator";
import user from "model/user";
import { faker } from "@faker-js/faker/.";
import session from "model/session";
import asset_type from "model/asset_type";
import currency from "model/currency";

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

async function getRandomAssetType() {
  const assetTypeList = await asset_type.findAllAvailableOptions();
  return getRandomElement(assetTypeList);
}

async function getRandomCurrency() {
  const currencyList = await currency.findAllAvailableOptions();
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
  getRandomAssetType,
  getRandomCurrency,
};

export default orchestrator;
