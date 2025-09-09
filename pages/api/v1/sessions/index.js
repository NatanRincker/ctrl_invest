import { createRouter } from "next-connect";
import controller from "infra/controller";
import authentication from "model/authentication";
import session from "model/session";

const router = createRouter();

router.post(postHandler);

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
