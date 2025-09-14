exports.up = (pgm) => {
  pgm.createTable("asset_positions", {
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

    quantity: { type: "numeric(19,8)", notNull: true, default: 0 },
    total_cost: { type: "numeric(19,8)", notNull: true, default: 0 },
    avg_cost: { type: "numeric(19,8)", notNull: true, default: 0 },
    realized_pnl: { type: "numeric(19,8)", notNull: true, default: 0 },

    updated_date: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });
};

exports.down = false;
