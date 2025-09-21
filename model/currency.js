import database from "infra/database";
import { NotFoundError, ValidationError } from "infra/errors";

async function findAllAvailableOptions() {
  const result = await database.query({
    text: `
      SELECT code, name, symbol
      FROM currencies;`,
    values: [],
  });
  return result.rows;
}

async function validateCodeExists(code) {
  if (typeof code !== "string") {
    throw new ValidationError({
      message: `[${code}] is not Valid`,
      action: "Please review submitted data",
    });
  }
  const result = await database.query({
    text: `
    SELECT code
    FROM currencies
    WHERE code = $1
    LIMIT 1;`,
    values: [code],
  });
  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Currency Not Found",
      action: "Please, check if the Currency code is correct",
    });
  }
  return true;
}

const currency = {
  findAllAvailableOptions,
  validateCodeExists,
};
export default currency;
