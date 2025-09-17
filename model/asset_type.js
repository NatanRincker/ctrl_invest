import database from "infra/database";
import { NotFoundError } from "infra/errors";

async function findAllAvailableOptions() {
  const result = await database.query({
    text: `
      SELECT code, name, description
      FROM asset_types;`,
    values: [],
  });
  return result.rows;
}

async function validateCodeExists(code) {
  const result = await database.query({
    text: `
    SELECT code
    FROM asset_types
    WHERE code = $1
    LIMIT 1;`,
    values: [code],
  });
  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Asset Type Not Found",
      action: "Please, check if the Asset Type is correct",
    });
  }
  return true;
}

const asset_type = {
  findAllAvailableOptions,
  validateCodeExists,
};
export default asset_type;
