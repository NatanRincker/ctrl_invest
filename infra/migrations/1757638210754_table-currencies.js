exports.up = (pgm) => {
  // Minimal ISO-4217 table (add more rows later)
  pgm.createTable("currencies", {
    code: { type: "char(3)", primaryKey: true, notNull: true }, // 'USD', 'BRL', 'EUR', ...
    name: { type: "varchar(60)", notNull: true },
    symbol: { type: "varchar(8)" },
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

  pgm.sql(`
    INSERT INTO currencies (code, name, symbol) VALUES
      ('USD','US Dollar','$'),
      ('BRL','Real Brasileiro','R$'),
      ('EUR','Euro','€')
    ON CONFLICT (code) DO NOTHING;
  `);
};

exports.down = false;
