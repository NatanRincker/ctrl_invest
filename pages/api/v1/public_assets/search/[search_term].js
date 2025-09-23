import { createRouter } from "next-connect";
import controller from "infra/controller";
import session from "model/session";
import public_asset from "model/public_assets";

const router = createRouter();

router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const requestSessionToken = request.cookies.session_id;
  const sessionObj = await session.findOneValidByToken(requestSessionToken);
  console.log(request.query.code);
  if (sessionObj) {
    const foundPubliAssets = await public_asset.searchPublicAsset(
      request.query.search_term,
    );
    let statusCode = 200;
    return response.status(statusCode).json(foundPubliAssets);
  }
}
