import database from "infra/database.js";
import password from "model/password.js";
import { ValidationError, NotFoundError } from "infra/errors.js";

async function create(userInputValues) {
  assertNoNullOrEmpty(userInputValues);
  await validateUniqueEmail(userInputValues.email);
  await hashPasswordInObject(userInputValues);

  const newUser = await runInsertQuery(userInputValues);
  return newUser;

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

async function findUserDataByEmail(email) {
  return await runSelectQuery(email);

  async function runSelectQuery(email) {
    const result = await database.query({
      text: `
          SELECT *
          FROM users
          WHERE
            lower(email) = lower($1)
          LIMIT 1;`,
      values: [email],
    });
    if (result.rowCount === 0) {
      throw new NotFoundError({
        message: "User Not Found",
        action: "Please, check if the E-mail is correct",
      });
    }
    return result.rows[0];
  }
}

async function findOneById(userId) {
  return await runSelectQuery(userId);

  async function runSelectQuery(userId) {
    const result = await database.query({
      text: `
          SELECT *
          FROM users
          WHERE
            id= $1
          LIMIT 1;`,
      values: [userId],
    });
    if (result.rowCount === 0) {
      throw new NotFoundError({
        message: "User Not Found",
        action: "Please, review uuid",
      });
    }
    return result.rows[0];
  }
}

async function update(email, updatedValues) {
  const currentUser = await findUserDataByEmail(email);

  if ("email" in updatedValues) {
    const isSendingSameEmail =
      currentUser.email.toLowerCase() === updatedValues.email.toLowerCase();
    if (!isSendingSameEmail) {
      await validateUniqueEmail(updatedValues.email);
    }
  }
  if ("password" in updatedValues) {
    await hashPasswordInObject(updatedValues);
  }

  const userWithUpdatedValues = { ...currentUser, ...updatedValues };
  const updateUser = await runUpdateQuery(userWithUpdatedValues);
  return updateUser;
}

async function runUpdateQuery(userWithUpdatedValues) {
  const result = await database.query({
    text: `
        UPDATE
          users
        SET
          name = $2,
          email = $3,
          password = $4,
          updated_date = TIMEZONE('utc', NOW())
        WHERE
          id = $1
        RETURNING
          *
        ;`,
    values: [
      userWithUpdatedValues.id,
      userWithUpdatedValues.name,
      userWithUpdatedValues.email,
      userWithUpdatedValues.password,
    ],
  });
  return result.rows[0];
}

async function hashPasswordInObject(userInputValues) {
  const hashedPassword = await await password.hash(userInputValues.password);
  userInputValues.password = hashedPassword;
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

const user = {
  create,
  update,
  findUserDataByEmail,
  findOneById,
};
export default user;
