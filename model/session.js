import crypto from "node:crypto";
import database from "infra/database";

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

const session = {
  create,
  TIMEOUT_IN_MILISECONDS,
};

export default session;
