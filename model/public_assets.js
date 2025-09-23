import database from "infra/database";
import { NotFoundError } from "infra/errors";

async function searchPublicAsset(searchTerm) {
  const lowerSearchTerm = searchTerm.toLowerCase();
  const processedSearchTerm = `%${lowerSearchTerm}%`;
  console.log("processedSearchTerm");
  console.log(processedSearchTerm);

  const result = await database.query({
    text: `
      SELECT *
      FROM public_assets
      WHERE
        LOWER(code) LIKE $1
        OR LOWER(name) LIKE $1
      ORDER BY code ASC;`,
    values: [processedSearchTerm],
  });
  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "No Public Asset has been Found",
      action: "Please, double check searching parameters",
    });
  }
  return result.rows;
}

async function findPublicAssetByCode(code) {
  const result = await database.query({
    text: `
      SELECT *
      FROM public_assets
      WHERE
        code = $1
      LIMIT 1;`,
    values: [code],
  });
  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "No Public Asset has been Found",
      action: "Please, double check public asset code",
    });
  }
  return result.rows[0];
}

const public_asset = {
  searchPublicAsset,
  findPublicAssetByCode,
};
export default public_asset;
