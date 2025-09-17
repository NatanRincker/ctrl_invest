import { createRouter } from "next-connect";
import controller from "infra/controller";
import user from "model/user.js";
import session from "model/session";

const router = createRouter();

router.get(getHandler);
router.patch(patchHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const foundUser = await user.findUserDataByEmail(request.query.email);
  let statusCode = 200;
  return response.status(statusCode).json(foundUser);
}

async function patchHandler(request, response) {
  const requestSessionToken = request.cookies.session_id;
  const sessionObj = await session.findOneValidByToken(requestSessionToken);

  if (sessionObj) {
    const userInputValues = request.body;

    const updatedUser = await user.update(request.query.email, userInputValues);

    let statusCode = 200;
    return response.status(statusCode).json(updatedUser);
  }
}
