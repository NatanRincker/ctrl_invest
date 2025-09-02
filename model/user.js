import database from "infra/database.js";
import { ValidationError } from "infra/errors.js";

async function create(userInputValues) {
  assertNoNullOrEmpty(userInputValues);
  await validateUniqueEmail(userInputValues.email);
  const newUser = await runInsertQuery(userInputValues);
  return newUser;

  async function validateUniqueEmail(email) {
    const result = await database.query({
      text: `
        SELECT email
        FROM users
        WHERE
          lower(email) = lower($1)
        LIMIT 1;`,
      values: [email],
    });
    if (result.rowCount > 0) {
      throw new ValidationError({
        message: "E-mail not Allowed",
        action: "Use a different email address",
      });
    }
  }

  async function runInsertQuery(userInputValues) {
    const result = await database.query({
      text: `
        insert into
          users (name, email, password)
        values
          ($1, $2, $3)
        returning
          *
        ;`,
      values: [
        userInputValues.name,
        userInputValues.email,
        userInputValues.password,
      ],
    });
    return result.rows[0];
  }
}

function assertNoNullOrEmpty(obj) {
  if (obj == null || typeof obj !== "object") {
    throw new TypeError("Expected an object");
  }
  const badKeys = Object.keys(obj).filter(
    (k) => obj[k] === null || obj[k] === "",
  );

  if (badKeys.length) {
    throw new ValidationError({
      message: `[${badKeys}] Cannot be empty nor null`,
      action: "Please review submitted data",
      fields: badKeys,
    });
  }
}

const user = {
  create,
};

export default user;
