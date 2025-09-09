import { createRouter } from "next-connect";
import controller from "infra/controller";
import user from "model/user";
import session from "model/session";

const router = createRouter();

router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const sessionToken = request.cookies.session_id;
  const validSessionObj = await session.findOneValidByToken(sessionToken);
  await session.renew(validSessionObj.id);
  controller.setSessionCookie(validSessionObj.token, response);
  response.setHeader(
    "Cache-Control",
    "no-store, no-cache, max-age=0, must-revalidate",
  );

  const sessionUser = await user.findOneById(validSessionObj.user_id);

  return response.status(200).json(sessionUser);
}
