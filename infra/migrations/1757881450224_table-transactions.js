exports.up = (pgm) => {
  pgm.createTable("transactions", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
    },
    asset_id: {
      type: "uuid",
      notNull: true,
    },
    transaction_type_key: {
      type: "varchar(100)",
      notNull: true,
    },
    quantity: { type: "numeric(19,8)", notNull: true }, // null for non-qty events
    unit_price: { type: "numeric(19,8)", notNull: true }, // null for non-qty events

    description: { type: "char(200)" },
    currency_code: { type: "char(3)", notNull: true },

    yfinance_compatible: { type: "boolean", notNull: true },

    occurred_date: { type: "timestamptz", notNull: true },

    created_date: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
    updated_date: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });
};

exports.down = false;
