exports.up = (pgm) => {
  pgm.createTable("assets", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    code: { type: "varchar(64)", notNull: true },
    name: { type: "varchar(200)", notNull: true },
    description: { type: "varchar(200)" },
    currency_code: { type: "char(3)", notNull: true },

    market_value: { type: "numeric(19,8)", notNull: true },
    paid_price: { type: "numeric(19,8)", notNull: true },

    yfinance_compatible: { type: "boolean", notNull: true },

    is_generic: { type: "boolean", notNull: true },

    user_id: {
      type: "uuid",
      notNull: true,
    },

    asset_type_code: { type: "varchar(64)", notNull: true },

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
