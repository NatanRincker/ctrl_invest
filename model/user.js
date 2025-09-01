import database from "infra/database";

async function create(userInputValues) {
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

const user = {
  create,
};

export default user;
