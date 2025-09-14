exports.up = (pgm) => {
  pgm.createTable("transaction_types", {
    id: {
      type: "integer",
      primaryKey: true,
      sequenceGenerated: {
        precedence: "ALWAYS",
      },
    },
    // Stable machine key (UPPER_SNAKE_CASE); reference in code/config
    key: { type: "varchar(100)", unique: true, notNull: true },

    // Human-friendly name (for UI)
    name: { type: "varchar(200)", notNull: true },
    description: { type: "varchar(250)" },

    // timestamp with UTC timezone
    created_date: {
      type: "timestamptz",
      default: pgm.func("timezone('utc', now())"),
      notNull: true,
    },
    updated_date: {
      type: "timestamptz",
      default: pgm.func("timezone('utc', now())"),
      notNull: true,
    },
  });

  // Make "key" column Unique
  pgm.createIndex("transaction_types", "key", {
    unique: true,
    name: "transaction_types_key_uk",
  });

  // Seed common types
  pgm.sql(`
    INSERT INTO transaction_types (key, name, description)
    VALUES
      ('BUY',          'Compra',                'Aumenta a posição; afeta quantidade e custo (preço médio)'),
      ('SELL',         'Venda',                 'Diminui a posição; realiza P&L em relação ao custo médio'),
      ('INCOME',       'Receita',               'Receita genérica do ativo (ex.: aluguel); não altera o custo'),
      ('EXPENSE',      'Despesa',               'Despesa genérica do ativo (ex.: manutenção, impostos); não altera o custo')
    ON CONFLICT (key) DO NOTHING;
  `);
};

exports.down = false;
