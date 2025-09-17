import { createRouter } from "next-connect";
import controller from "infra/controller";
import session from "model/session";
import asset_type from "model/asset_type";

const router = createRouter();

router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const requestSessionToken = request.cookies.session_id;
  const sessionObj = await session.findOneValidByToken(requestSessionToken);
  let asset_type_list;
  if (sessionObj) {
    asset_type_list = await asset_type.findAllAvailableOptions();
  }

  let statusCode = 200;
  return response.status(statusCode).json(asset_type_list);
}
