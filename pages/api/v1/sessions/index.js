import { createRouter } from "next-connect";
import controller from "infra/controller";
import authentication from "model/authentication";
import session from "model/session";

const router = createRouter();

router.post(postHandler);
router.delete(deleteHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const userInputValues = request.body;
  const authenticatedUser = await authentication.getAuthenticatedUser(
    userInputValues.email,
    userInputValues.password,
  );

  const newSession = await session.create(authenticatedUser.id);
  let statusCode = 201;
  controller.setSessionCookie(newSession.token, response);
  controller.setNoCacheSession(response);

  return response.status(statusCode).json(newSession);
}

async function deleteHandler(request, response) {
  const requestSessionToken = request.cookies.session_id;
  console.log(requestSessionToken);
  const sessionObj = await session.findOneValidByToken(requestSessionToken);
  const expiredSession = await session.expireById(sessionObj.id);
  controller.clearSessionCookie(response);

  let statusCode = 200;
  return response.status(statusCode).json(expiredSession);
}
