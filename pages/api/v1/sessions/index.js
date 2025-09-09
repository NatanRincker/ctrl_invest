import { createRouter } from "next-connect";
import controller from "infra/controller";
import authentication from "model/authentication";
import session from "model/session";
import * as cookie from "cookie";

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
  const setCookie = cookie.serialize("session_id", newSession.token, {
    path: "/",
    maxAge: session.TIMEOUT_IN_MILISECONDS / 1000,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
  response.setHeader("Set-Cookie", setCookie);
  return response.status(statusCode).json(newSession);
}
