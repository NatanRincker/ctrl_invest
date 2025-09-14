exports.up = (pgm) => {
  // Ensure we can upsert safely by code
  pgm.alterColumn("asset_types", "description", { type: "varchar(200)" });
  pgm.addConstraint("asset_types", "asset_types_code_uk", {
    unique: ["code"],
  });

  pgm.sql(`
    INSERT INTO asset_types (code, name, description)
    VALUES
      ('STOCK',          'Stock',                         'Ações listadas em mercados internacionais'),
      ('ACAO',           'Ação (B3)',                    'Ações listadas na B3'),
      ('ETF',            'ETF',                           'Exchange Traded Fund'),
      ('FII',            'FII (Fundo Imobiliário)',       'Fundos imobiliários negociados na B3'),
      ('REIT',           'REITs',                         'Real Estate Investment Trust (EUA e outros)'),
      ('RENDA_FIXA',     'Renda Fixa',                    'Títulos de renda fixa (CDB, LCI/LCA, Debêntures etc.)'),
      ('TESOURO_DIRETO', 'Tesouro Direto',                'Títulos públicos federais'),
      ('CRIPTO',         'Cripto',                        'Criptomoedas'),
      ('BDR',            'BDR',                           'Brazilian Depositary Receipts'),
      ('COMMODITY',      'Commodity',                     'Ouro, petróleo, e outras commodities')
    ON CONFLICT (code) DO NOTHING;
  `);
};

exports.down = false;
