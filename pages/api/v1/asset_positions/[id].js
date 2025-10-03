import { createRouter } from "next-connect";
import controller from "infra/controller";
import session from "model/session";
import asset_position from "model/asset_position";

const router = createRouter();

router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const requestSessionToken = request.cookies.session_id;
  const sessionObj = await session.findOneValidByToken(requestSessionToken);
  console.log(request.query.id);
  if (sessionObj) {
    const publicAsset = await asset_position.findUserAssetPositionById(
      request.query.id,
      sessionObj.user_id,
    );
    let statusCode = 200;
    return response.status(statusCode).json(publicAsset);
  }
}
