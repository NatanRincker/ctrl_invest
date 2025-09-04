import { createRouter } from "next-connect";
import controller from "infra/controller";
import user from "model/user.js";

const router = createRouter();

router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const foundUser = await user.findUserDataByEmail(request.query.email);
  let statusCode = 200;
  return response.status(statusCode).json(foundUser);
}
