exports.up = (pgm) => {
  pgm.createTable("users", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    name: {
      type: "varchar(200)",
      notNull: true,
    },
    email: {
      type: "varchar(254)",
      notNull: true,
      unique: true,
    },
    // why 72? Maximun length bcrypt allows
    password: {
      type: "varchar(72)",
      notNull: true,
    },
    // timestamp with UTC timezone
    created_date: {
      type: "timestamptz",
      default: pgm.func("now()"),
      notNull: true,
    },
    updated_date: {
      type: "timestamptz",
      default: pgm.func("now()"),
      notNull: true,
    },
  });
};

exports.down = false;
