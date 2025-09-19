import { createRouter } from "next-connect";
import controller from "infra/controller";
import session from "model/session";
import transaction from "model/transaction";

const router = createRouter();

router.post(postHandler);
router.patch(patchHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const requestSessionToken = request.cookies.session_id;
  const sessionObj = await session.findOneValidByToken(requestSessionToken);
  const transactionInputData = request.body;
  if (sessionObj) {
    const createdTransaction = await transaction.create({
      user_id: sessionObj.user_id,
      ...transactionInputData,
    });

    let statusCode = 201;
    return response.status(statusCode).json(createdTransaction);
  }
}

async function patchHandler(request, response) {
  const requestSessionToken = request.cookies.session_id;
  const sessionObj = await session.findOneValidByToken(requestSessionToken);
  const transactionInputValues = request.body;

  if (sessionObj) {
    const updatedTransaction = await transaction.update(transactionInputValues);
    let statusCode = 200;

    return response.status(statusCode).json(updatedTransaction);
  }
}
