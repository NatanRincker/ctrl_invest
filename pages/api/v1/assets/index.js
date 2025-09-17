import { createRouter } from "next-connect";
import controller from "infra/controller";
import asset from "model/asset";
import session from "model/session";

const router = createRouter();

router.post(postHandler);
router.patch(patchHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const requestSessionToken = request.cookies.session_id;
  const sessionObj = await session.findOneValidByToken(requestSessionToken);
  const assetInputValues = request.body;
  let createdAsset;
  if (sessionObj) {
    createdAsset = await asset.createUserAsset(
      assetInputValues,
      sessionObj.user_id,
    );
  }
  let statusCode = 201;

  return response.status(statusCode).json(createdAsset);
}

async function patchHandler(request, response) {
  const requestSessionToken = request.cookies.session_id;
  const sessionObj = await session.findOneValidByToken(requestSessionToken);
  const assetInputValues = request.body;

  if (sessionObj) {
    const updatedAsset = await asset.update(assetInputValues);
    let statusCode = 200;

    return response.status(statusCode).json(updatedAsset);
  }
}
