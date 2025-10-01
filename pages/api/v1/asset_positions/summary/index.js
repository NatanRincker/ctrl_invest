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
  if (sessionObj) {
    const assetPositions = await asset_position.getUserAssetPositionsSummary(
      sessionObj.user_id,
    );
    let statusCode = 200;
    return response.status(statusCode).json(assetPositions);
  }
}
