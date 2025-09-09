import user from "model/user.js";
import password from "model/password";
import { NotFoundError, UnauthorizedError } from "infra/errors";
async function getAuthenticatedUser(inputEmail, inputPassword) {
  let passwordMatches;
  try {
    const storedUser = await user.findUserDataByEmail(inputEmail);
    passwordMatches = await password.compare(
      inputPassword,
      storedUser.password,
    );
    if (!passwordMatches) {
      throw new UnauthorizedError({
        message: "Login data does not match",
        action: "Please review login information and try again",
      });
    }
    return storedUser;
  } catch (error) {
    if (error instanceof NotFoundError) {
      if (passwordMatches === undefined) {
        // avoiding response time to be difference in case email does not match
        await password.compare("dummyPassword1", "dummyPassowrd2");
      }
      throw new UnauthorizedError({
        message: "Login data does not match",
        action: "Please review login information and try again",
      });
    }
    throw error;
  }
}

const authentication = {
  getAuthenticatedUser,
};
export default authentication;
