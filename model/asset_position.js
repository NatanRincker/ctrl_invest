import database from "infra/database";
import Decimal from "decimal.js";
import { NotFoundError } from "infra/errors";

async function handleNewTransaction(transactionObj) {
  const { asset_id, user_id } = transactionObj;
  const positionToUpdate = await findAssetPosition(asset_id, user_id);
  if (positionToUpdate) {
    await updateAssetPosition(positionToUpdate, transactionObj);
  } else {
    await createAssetPosition(transactionObj);
  }
}

async function getUserAssetPositions(user_id) {
  const result = await database.query({
    text: `
    SELECT *
    FROM asset_positions
    WHERE
      user_id = $1;`,
    values: [user_id],
  });
  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "No Asset Positions Found For This User",
      action: "Please, add an asset and try again.",
    });
  }
  return result.rows;
}

async function getUserAssetPositionsSummary(user_id) {
  const result = await database.query({
    text: `
    SELECT
      p.id,
      p.asset_id,
      a.name, a.code, a.currency_code,
      p.quantity, p.total_cost,
      a.market_value * p.quantity AS total_market_value,
      p.yield, p.realized_pnl, a.yfinance_compatible
    FROM asset_positions p
    JOIN assets a ON a.id = p.asset_id
    WHERE
      p.user_id = $1;
    `,
    values: [user_id],
  });
  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "No Asset Position Summary to Return",
      action: "Please, add an asset and try again.",
    });
  }
  return result.rows;
}

async function findAssetPosition(asset_id, user_id) {
  const result = await database.query({
    text: `
      SELECT *
      FROM asset_positions
      WHERE
        asset_id = $1
        AND user_id = $2
      LIMIT 1;`,
    values: [asset_id, user_id],
  });
  if (result.rowCount === 0) {
    return false;
  }
  return result.rows[0];
}

async function findUserAssetPositionById(position_id, user_id) {
  //console.log("position_id " + position_id);
  //console.log("user_id " + user_id);

  const result = await database.query({
    text: `
      SELECT *
      FROM asset_positions
      WHERE
        id = $1
        AND user_id = $2
      LIMIT 1;`,
    values: [position_id, user_id],
  });
  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Unable to locate Specidied Asset Position for This User",
      acion: "Check asset position id",
    });
  }
  return result.rows[0];
}

async function createAssetPosition(transactionObj) {
  const quantity = new Decimal(transactionObj.quantity);
  const unitPrice = new Decimal(transactionObj.unit_price);
  const totalCost = quantity.times(unitPrice);

  const newPosition = {
    user_id: transactionObj.user_id,
    asset_id: transactionObj.asset_id,
    quantity: transactionObj.quantity,
    total_cost: totalCost.toString(),
    avg_cost: transactionObj.unit_price,
  };

  console.log(newPosition);
  const result = await database.query({
    text: `
      INSERT into
        asset_positions (
          user_id,
          asset_id,
          quantity,
          total_cost,
          avg_cost
        )
      values
        ($1, $2, $3, $4, $5)
      returning
        *
      ;`,
    values: [
      newPosition.user_id,
      newPosition.asset_id,
      newPosition.quantity,
      newPosition.total_cost,
      newPosition.avg_cost,
    ],
  });
  return result.rows[0];
}

async function updateAssetPosition(position, transaction) {
  const updatedInputValues = computeAssetPosition(position, transaction);

  console.log("updateAssetPosition");
  console.log(updatedInputValues);

  return runUpdateQuery(updatedInputValues);

  async function runUpdateQuery(updatedInputValues) {
    const result = await database.query({
      text: `
    UPDATE
      asset_positions
    SET
      user_id = $2,
      asset_id = $3,
      quantity = $4,
      total_cost = $5,
      avg_cost = $6,
      realized_pnl = $7,
      yield = $8,
      updated_date = TIMEZONE('utc', NOW())
    WHERE
      id = $1
    RETURNING
      *
    ;`,
      values: [
        updatedInputValues.id,
        updatedInputValues.user_id,
        updatedInputValues.asset_id,
        updatedInputValues.quantity,
        updatedInputValues.total_cost,
        updatedInputValues.avg_cost,
        updatedInputValues.realized_pnl,
        updatedInputValues.yield,
      ],
    });
    return result.rows[0];
  }
}

function computeAssetPosition(position, transaction) {
  if (
    transaction.transaction_type_key === "BUY" ||
    transaction.transaction_type_key === "SELL"
  ) {
    // recalc quantity, total_cost, avg_cost
    const positionQuantity = new Decimal(position.quantity);
    const positionTotalCost = new Decimal(position.total_cost);
    const positionAvgCost = new Decimal(position.avg_cost);

    const transactionQuantity = new Decimal(transaction.quantity);
    const transactionUnitPrice = new Decimal(transaction.unit_price);
    const transactionTotalAmount =
      transactionQuantity.times(transactionUnitPrice);

    let updatedQuantity;
    let updatedTotalCost;
    let updatedRealizedPnL = new Decimal(position.realized_pnl);
    if (transaction.transaction_type_key === "BUY") {
      updatedQuantity = positionQuantity.add(transactionQuantity);
      updatedTotalCost = positionTotalCost.add(transactionTotalAmount);
    } else if (transaction.transaction_type_key === "SELL") {
      updatedQuantity = positionQuantity.minus(transactionQuantity);
      updatedTotalCost = positionTotalCost.minus(transactionTotalAmount);

      const delta = new Decimal(transactionUnitPrice.minus(positionAvgCost));
      updatedRealizedPnL = delta.times(transactionQuantity);
    }

    const updatedAvgCost = updatedQuantity.equals(0)
      ? 0
      : updatedTotalCost.div(updatedQuantity);

    return {
      ...position,
      quantity: updatedQuantity.toString(),
      total_cost: updatedTotalCost.toString(),
      avg_cost: updatedAvgCost.toString(),
      realized_pnl: updatedRealizedPnL.toString(),
    };
  } else if (
    transaction.transaction_type_key === "INCOME" ||
    transaction.transaction_type_key === "EXPENSE"
  ) {
    //recalc yield
    const positionYield = new Decimal(position.yield);

    const transactionQuantity = new Decimal(transaction.quantity);
    const transactionUnitPrice = new Decimal(transaction.unit_price);
    const transactionTotalAmount =
      transactionQuantity.times(transactionUnitPrice);

    let updatedYield;
    if (transaction.transaction_type_key === "INCOME") {
      updatedYield = positionYield.add(transactionTotalAmount);
    } else {
      updatedYield = positionYield.minus(transactionTotalAmount);
    }

    return {
      ...position,
      yield: updatedYield.toString(),
    };
  }
}

const asset_position = {
  handleNewTransaction,
  getUserAssetPositions,
  getUserAssetPositionsSummary,
  findUserAssetPositionById,
};

export default asset_position;
