import database from "infra/database";
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} from "infra/errors";
import currency from "./currency";
import asset_type from "./asset_type";

async function update(assetInputValues) {
  console.log("assetInputValues.id");
  console.log(assetInputValues.id);
  const currentAsset = await findAssetById(assetInputValues.id);
  const updateInputValues = {
    ...currentAsset,
    ...assetInputValues,
  };
  assertMandatoryKeys(updateInputValues);
  assertPriceValue("market_value", updateInputValues.market_value);
  assertPriceValue("paid_price", updateInputValues.paid_price);
  await assertValidReferences(updateInputValues);

  const result = await database.query({
    text: `
    UPDATE
      assets
    SET
      code = $2,
      name = $3,
      description = $4,
      currency_code = $5,
      market_value = $6,
      paid_price = $7,
      yfinance_compatible = $8,
      is_generic = $9,
      asset_type_code = $10,
      updated_date = TIMEZONE('utc', NOW())
    WHERE
      id = $1
    RETURNING
      *
    ;`,
    values: [
      updateInputValues.id,
      updateInputValues.code,
      updateInputValues.name,
      updateInputValues.description,
      updateInputValues.currency_code,
      updateInputValues.market_value,
      updateInputValues.paid_price,
      updateInputValues.yfinance_compatible,
      updateInputValues.is_generic,
      updateInputValues.asset_type_code,
    ],
  });
  return result.rows[0];
}

async function createUserAsset(assetInputValues, userId) {
  const inserInputValues = { userId, ...assetInputValues };
  assertMandatoryKeys(inserInputValues);
  assertPriceValue("market_value", inserInputValues.market_value);
  assertPriceValue("paid_price", inserInputValues.paid_price);
  await assertValidReferences(inserInputValues);
  const result = await database.query({
    text: `
    INSERT into
      assets (
        code,
        name,
        description,
        currency_code,
        market_value,
        paid_price,
        yfinance_compatible,
        is_generic,
        user_id,
        asset_type_code
      )
    values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    returning
      *
    ;`,
    values: [
      inserInputValues.code,
      inserInputValues.name,
      inserInputValues.description,
      inserInputValues.currency_code,
      inserInputValues.market_value,
      inserInputValues.paid_price,
      inserInputValues.yfinance_compatible,
      inserInputValues.is_generic,
      inserInputValues.userId,
      inserInputValues.asset_type_code,
    ],
  });
  return result.rows[0];
}

function assertMandatoryKeys(obj) {
  const optionalKeys = ["description"];

  if (obj == null || typeof obj !== "object") {
    throw new TypeError("Expected an object");
  }
  const badKeys = Object.keys(obj).filter(
    (k) => obj[k] === null || obj[k] === "",
  );
  const badRequiredKeys = badKeys.filter((k) => !optionalKeys.includes(k));

  if (badRequiredKeys.length) {
    throw new ValidationError({
      message: `[${badRequiredKeys}] Cannot be empty nor null`,
      action: "Please review submitted data",
      fields: badRequiredKeys,
    });
  }
}

function assertPriceValue(keyName, StringValue) {
  if (typeof StringValue !== "string") {
    throw new ValidationError({
      message: `[${keyName}] is not a string`,
      action: "Please submit the number in string format",
      fields: keyName,
    });
  }

  const num = Number(StringValue);
  if (isNaN(num)) {
    throw new ValidationError({
      message: `[${keyName}] is not a valid number`,
      action: "Please review submitted data",
      fields: keyName,
    });
  }

  const parts = StringValue.split(".");
  const integerPart = parts[0].replace("-", "");
  const decimalPart = parts.length > 1 ? parts[1] : "";

  // Check total digits (precision)
  if (integerPart.length + decimalPart.length > 19) {
    throw new ValidationError({
      message: `[${keyName}] exceeds the supported amount`,
      action: "Please review submitted data",
      fields: keyName,
    });
  }
  // Check digits after decimal (scale)
  if (decimalPart.length > 8) {
    throw new ValidationError({
      message: `[${keyName}] exceeds the supported fractional amount`,
      action: "Please review submitted data",
      fields: keyName,
    });
  }

  return true;
}

async function assertValidReferences(inserData) {
  await currency.validateCodeExists(inserData.currency_code);
  await asset_type.validateCodeExists(inserData.asset_type_code);
}

async function assertAssetBelongsToUser(asset_id, user_id) {
  if (typeof asset_id !== "string" && typeof user_id !== "string") {
    throw new ValidationError({
      message: `[
      ${typeof asset_id === "string" ? "asset_id," : ""}
      ${typeof user_id === "string" ? "user_id," : ""}] is not Valid`,
      action: "Please review submitted data",
      fields: "occurred_date",
    });
  }
  const result = await database.query({
    text: `
    SELECT *
    FROM assets
    WHERE id = $1
    AND user_id = $2
    LIMIT 1;`,
    values: [asset_id, user_id],
  });
  if (result.rowCount === 0) {
    throw new UnauthorizedError({
      message: "Asset and User are not related",
      action: "Please, check if asset_id and user_id are correct",
    });
  }
  return true;
}

async function findAssetById(assetId) {
  const result = await database.query({
    text: `
      SELECT *
      FROM assets
      WHERE
        id = $1
      LIMIT 1;`,
    values: [assetId],
  });
  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Asset Not Found",
      action: "Please, check if the Asset Data",
    });
  }
  return result.rows[0];
}

const asset = {
  createUserAsset,
  update,
  assertAssetBelongsToUser,
};
export default asset;
