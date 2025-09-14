exports.up = (pgm) => {
  pgm.createTable("asset_types", {
    id: {
      type: "integer",
      notNull: true,
      primaryKey: true,
      sequenceGenerated: {
        precedence: "ALWAYS",
      },
    },

    code: { type: "varchar(64)", notNull: true },
    name: { type: "varchar(200)", notNull: true },
    description: { type: "char(200)" },

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
