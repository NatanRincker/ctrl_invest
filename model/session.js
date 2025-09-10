import crypto from "node:crypto";
import database from "infra/database";
import { UnauthorizedError } from "infra/errors";

const TIMEOUT_IN_MILISECONDS =
  60 * // segundos
  60 * // to hours
  2 * // amount of hours
  1000; // to miliseconds

async function create(userId) {
  const token = crypto.randomBytes(48).toString("hex");
  const expireDate = new Date(Date.now() + TIMEOUT_IN_MILISECONDS);

  return await runInsertQuery(token, userId, expireDate);

  async function runInsertQuery(token, userId, expireDate) {
    const result = await database.query({
      text: `
        insert into
          sessions (token, user_id, expire_date)
        values
          ($1, $2, $3)
        returning
          *
        ;`,
      values: [token, userId, expireDate],
    });
    return result.rows[0];
  }
}

async function findOneValidByToken(token) {
  const result = await database.query({
    text: `
          SELECT *
          FROM sessions
          WHERE
            token = $1
            AND expire_date > NOW()
          LIMIT 1;`,
    values: [token],
  });
  if (result.rowCount === 0) {
    throw new UnauthorizedError({
      message: "Unable to Find a Valid Session",
      action: "Please, review session information",
    });
  }
  return result.rows[0];
}

async function renew(sessionId) {
  const expireDate = new Date(Date.now() + TIMEOUT_IN_MILISECONDS);
  const result = await database.query({
    text: `
      UPDATE
        sessions
      SET
        expire_date = $2,
        updated_date = TIMEZONE('utc', NOW())
      WHERE
        id = $1
      RETURNING
        *
      ;`,
    values: [sessionId, expireDate],
  });
  return result.rows[0];
}

async function expireById(sessionId) {
  return await runUpdateQuery(sessionId);
  async function runUpdateQuery(sessionId) {
    const result = await database.query({
      text: `
          UPDATE
            sessions
          SET
            expire_date = expire_date - interval '1 year',
            updated_date = TIMEZONE('utc', NOW())
          WHERE
            id = $1
          RETURNING
            *
          ;`,
      values: [sessionId],
    });
    return result.rows[0];
  }
}

const session = {
  create,
  TIMEOUT_IN_MILISECONDS,
  findOneValidByToken,
  renew,
  expireById,
};

export default session;
