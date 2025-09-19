import { createRouter } from "next-connect";
import controller from "infra/controller";
import session from "model/session";
import transaction from "model/transaction";

const router = createRouter();

router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const requestSessionToken = request.cookies.session_id;
  const sessionObj = await session.findOneValidByToken(requestSessionToken);
  if (sessionObj) {
    console.log(request.query.asset_id);
    console.log(sessionObj.user_id);
    const assetTransactions = await transaction.findAssetTransactions(
      request.query.asset_id,
      sessionObj.user_id,
    );
    let statusCode = 200;
    return response.status(statusCode).json(assetTransactions);
  }
}
