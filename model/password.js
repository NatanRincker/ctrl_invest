import bcryptjs from "bcryptjs";

async function hash(password) {
  const rounds = getNumberOfRounds();
  return await bcryptjs.hash(password, rounds);
}

async function compare(textPassword, storedHash) {
  return await bcryptjs.compare(textPassword, storedHash);
}

function getNumberOfRounds() {
  return process.env.NODE_ENV === "production" ? 13 : 1;
}

const password = {
  hash,
  compare,
};

export default password;
