import migrationRunner from "node-pg-migrate";
import { resolve } from "node:path";
import database from "infra/database.js";

export default async function migrations(request, response) {
  let dbClient;
  try {
    dbClient = await database.getNewClient();
    const defaultMigrationOptions = {
      dbClient: dbClient,
      dryRun: true,
      dir: resolve("infra", "migrations"),
      direction: "up",
      verbose: true,
      migrationsTable: "pgmigrations",
    };
    let migrationsResponse;
    let statusCode;
    if (request.method === "GET") {
      const pendingMigrations = await migrationRunner(defaultMigrationOptions);
      statusCode = 200;
      migrationsResponse = pendingMigrations;
    } else if (request.method === "POST") {
      const migratedMigrations = await migrationRunner({
        ...defaultMigrationOptions,
        dryRun: false,
      });
      statusCode = migratedMigrations.length > 0 ? 201 : 200;
      migrationsResponse = migratedMigrations;
    } else {
      statusCode = 405; // Method Not Allowed
      migrationsResponse = { error: `Method ${request.method} Not Allowed` };
    }
    return response.status(statusCode).json(migrationsResponse);
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    await dbClient.end();
  }
}
