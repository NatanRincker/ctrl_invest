import database from "infra/database";
import { ValidationError, NotFoundError } from "infra/errors";
import currency from "./currency";
import asset from "./asset";

async function create(transactionData) {
  assertMandatoryKeys(transactionData);
  assertPriceValue("quantity", transactionData.quantity);
  assertPriceValue("unit_price", transactionData.unit_price);
  transactionData.occurred_date = assertOccuredDate(
    transactionData.occurred_date,
  );
  await assertValidReferences(transactionData);

  const result = await database.query({
    text: `
    INSERT into
      transactions (
        user_id,
        asset_id,
        transaction_type_key,
        quantity,
        unit_price,
        description,
        currency_code,
        occurred_date
      )
    values
      ($1, $2, $3, $4, $5, $6, $7, $8)
    returning
      *
    ;`,
    values: [
      transactionData.user_id,
      transactionData.asset_id,
      transactionData.transaction_type_key,
      transactionData.quantity,
      transactionData.unit_price,
      transactionData.description,
      transactionData.currency_code,
      transactionData.occurred_date,
    ],
  });
  return result.rows[0];
}

async function findAssetTransactions(asset_id, user_id) {
  await asset.assertAssetBelongsToUser(asset_id, user_id);
  const result = await database.query({
    text: `
    SELECT * from
      transactions
    WHERE
      asset_id = $1
    ;`,
    values: [asset_id],
  });
  return result.rows;
}

async function update(transactionData) {
  const currentTransaction = await findTransactionById(transactionData.id);
  const updateInputValues = {
    ...currentTransaction,
    ...transactionData,
  };

  assertMandatoryKeys(updateInputValues);
  assertPriceValue("quantity", updateInputValues.quantity);
  assertPriceValue("unit_price", updateInputValues.unit_price);
  if (transactionData.occured_date) {
    updateInputValues.occurred_date = assertOccuredDate(
      updateInputValues.occurred_date,
    );
  }
  await assertValidReferences(updateInputValues);

  const result = await database.query({
    text: `
    UPDATE
      transactions
    SET
      user_id = $2,
      asset_id = $3,
      transaction_type_key = $4,
      quantity = $5,
      unit_price = $6,
      description = $7,
      currency_code = $8,
      occurred_date = $9,
      updated_date = TIMEZONE('utc', NOW())
    WHERE
      id = $1
    RETURNING
      *
    ;`,
    values: [
      updateInputValues.id,
      updateInputValues.user_id,
      updateInputValues.asset_id,
      updateInputValues.transaction_type_key,
      updateInputValues.quantity,
      updateInputValues.unit_price,
      updateInputValues.description,
      updateInputValues.currency_code,
      updateInputValues.occurred_date,
    ],
  });
  return result.rows[0];
}

async function findTransactionById(transactionId) {
  const result = await database.query({
    text: `
      SELECT *
      FROM transactions
      WHERE
        id = $1
      LIMIT 1;`,
    values: [transactionId],
  });
  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Asset Not Found",
      action: "Please, check if the Asset Data",
    });
  }
  return result.rows[0];
}

function assertMandatoryKeys(obj) {
  const optionalKeys = ["description", "occurred_date"];

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

function assertOccuredDate(occured_date) {
  if (
    occured_date === null ||
    occured_date === undefined ||
    occured_date === ""
  ) {
    return new Date(Date.now()).toISOString();
  }
  if (typeof occured_date !== "string") {
    throw new ValidationError({
      message: "[occurred_date] is not Valid",
      action: "Please review submitted data",
      fields: "occurred_date",
    });
  } else {
    console.log("enter try");
    const isValidDateString = database.isValidDateFormat(occured_date);
    console.log(occured_date);
    console.log(isValidDateString);
    if (!isValidDateString) {
      throw new ValidationError({
        message: "[occurred_date] is not Valid",
        action: "Please review submitted data",
        fields: "occurred_date",
      });
    }
    return occured_date;
  }
}
async function assertValidReferences(insertData) {
  await currency.validateCodeExists(insertData.currency_code);
  await validateTransactionType(insertData.transaction_type_key);
  await asset.assertAssetBelongsToUser(insertData.asset_id, insertData.user_id);
}

async function validateTransactionType(transaction_type_key) {
  if (typeof transaction_type_key !== "string") {
    throw new ValidationError({
      message: `[transaction_type_key] is not Valid`,
      action: "Please review submitted data",
      fields: "transaction_type_key",
    });
  }
  const result = await database.query({
    text: `
    SELECT key
    FROM transaction_types
    WHERE key = $1
    LIMIT 1;`,
    values: [transaction_type_key],
  });
  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Transaction Type Not Found",
      action: "Please, check if the Transaction Type Key is correct",
    });
  }
  return true;
}

async function getAvailableTransactionTypes() {
  const result = await database.query({
    text: `
    SELECT key, name, description
    FROM transaction_types;`,
    values: [],
  });
  return result.rows;
}

const transaction = {
  create,
  update,
  getAvailableTransactionTypes,
  findAssetTransactions,
};

export default transaction;
