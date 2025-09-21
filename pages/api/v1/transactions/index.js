import { createRouter } from "next-connect";
import controller from "infra/controller";
import session from "model/session";
import transaction from "model/transaction";

const router = createRouter();

router.post(postHandler);
router.patch(patchHandler);
router.delete(deleteHandler);

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

async function deleteHandler(request, response) {
  const requestSessionToken = request.cookies.session_id;
  const sessionObj = await session.findOneValidByToken(requestSessionToken);
  if (sessionObj) {
    const transaction_id = request.body.id;
    const deletedTransaction = await transaction.deleteUserTransaction(
      transaction_id,
      sessionObj.user_id,
    );
    let statusCode = 200;
    return response.status(statusCode).json(deletedTransaction);
  }
}
