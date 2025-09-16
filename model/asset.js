import database from "infra/database";
import { ValidationError } from "infra/errors";

async function createUserAsset(assetInputValues, userId) {
  const inserInputValues = { userId, ...assetInputValues };
  assertMandatoryKeys(inserInputValues);
  assertPriceValues("market_value", inserInputValues.market_value);
  assertPriceValues("paid_price", inserInputValues.paid_price);
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
  delete obj[optionalKeys[0]];

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

function assertPriceValues(keyName, value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError({
      message: `[${keyName}] is not a valid number`,
      action: "Please review submitted data",
      fields: keyName,
    });
  }
  const abs = Math.abs(value);

  // Integer digits check (precision cap via integer part)
  const intPart = Math.trunc(abs);
  // 11 digits max => 99_999_999_999
  if (intPart > 99_999_999_999) {
    throw new ValidationError({
      message: `[${keyName}] exceeds the supported amount`,
      action: "Please review submitted data",
      fields: keyName,
    });
  }
  // Fractional digits check: must be representable with <= 8 decimals
  // Use rounding to 8 dp then compare with a small epsilon
  const rounded8 = Math.round(abs * 1e8) / 1e8;
  const epsilon = 1e-12; // tolerance for binary floats (way stricter than 1e-8)
  if (Math.abs(abs - rounded8) > epsilon) {
    throw new ValidationError({
      message: `[${keyName}] exceeds the supported fractional amount`,
      action: "Please review submitted data",
      fields: keyName,
    });
  }
}

const asset = {
  createUserAsset,
};
export default asset;
