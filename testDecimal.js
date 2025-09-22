import Decimal from "decimal.js";

const quantity = new Decimal(10);
const unitPrice = new Decimal(3);

const totalCost = quantity.div(unitPrice);

const back = totalCost.times(unitPrice);

console.log(totalCost);
console.log(back);
