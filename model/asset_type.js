import database from "infra/database";

async function findAllAvailableOptions() {
  const result = await database.query({
    text: `
      SELECT code, name, description
      FROM asset_types;`,
    values: [],
  });
  return result.rows;
}

const asset_type = {
  findAllAvailableOptions,
};
export default asset_type;
