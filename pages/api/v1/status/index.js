import database from "infra/database";
import { InternalServerError } from "infra/errors";

export default async function status(request, response) {
  try {
    const updatedAt = new Date().toISOString();
    const queryVersion = await database.query("SHOW server_version;");
    const pgVersion = queryVersion.rows[0].server_version;

    const queryMaxConnections = await database.query("SHOW max_connections;");
    const pgMaxConnectionsBuffer = queryMaxConnections.rows[0].max_connections;
    const pgMaxConnections = validateNumericValue(pgMaxConnectionsBuffer);

    const queryCurrentConnections = await database.query(
      "SELECT sum(numbackends) FROM pg_stat_database;",
    );
    const pgCurrentConnectionsBuffer = queryCurrentConnections.rows[0].sum;
    const pgCurrentConnections = validateNumericValue(
      pgCurrentConnectionsBuffer,
    );

    response.status(200).json({
      updated_at: updatedAt,
      dependencies: {
        database: {
          version: pgVersion,
          max_connections: pgMaxConnections,
          current_connections: pgCurrentConnections,
        },
      },
    });
  } catch (error) {
    console.log("\n Error inside controller:");
    const publicErrorObject = new InternalServerError({
      cause: error,
    });
    console.error(publicErrorObject);
    response.status(500).json(publicErrorObject);
  }
}

function validateNumericValue(prop) {
  prop = typeof prop == "string" ? prop : -1;
  prop = Number(prop);
  return isNaN(prop) ? -1 : prop;
}
