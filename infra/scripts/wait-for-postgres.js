const { exec } = require("node:child_process");

function checkPostgres() {
  const handleReturn = (error, stdout) => {
    if (stdout.search("accepting connections") === -1) {
      process.stdout.write(".");

      checkPostgres();
      return;
    }
    console.log("\n🟢 Postgres is Accepting Connections");
  };
  exec("docker exec postgres-dev pg_isready --host localhost", handleReturn);
}

process.stdout.write("\n\n🔴 Awaiting for Postgres to accept connections:");
checkPostgres();
