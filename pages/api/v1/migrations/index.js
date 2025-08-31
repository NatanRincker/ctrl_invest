import migrationRunner from "node-pg-migrate";
import { resolve } from "node:path";
import database from "infra/database.js";
import { createRouter } from "next-connect";

import controller from "infra/controller";

const router = createRouter();

router.get(getHandler);
router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  let dbClient;
  try {
    dbClient = await database.getNewClient();

    const migratedMigrations = await migrationRunner({
      dbClient,
      ...defaultMigrationOptions,
      dryRun: false,
    });
    let statusCode = migratedMigrations.length > 0 ? 201 : 200;
    let migrationsResponse = migratedMigrations;

    return response.status(statusCode).json(migrationsResponse);
  } finally {
    await dbClient.end();
  }
}

async function getHandler(request, response) {
  let dbClient;
  try {
    dbClient = await database.getNewClient();
    const pendingMigrations = await migrationRunner({
      dbClient,
      ...defaultMigrationOptions,
    });
    let statusCode = 200;
    let migrationsResponse = pendingMigrations;
    return response.status(statusCode).json(migrationsResponse);
  } finally {
    await dbClient.end();
  }
}

const defaultMigrationOptions = {
  dryRun: true,
  dir: resolve("infra", "migrations"),
  direction: "up",
  verbose: true,
  migrationsTable: "pgmigrations",
};
