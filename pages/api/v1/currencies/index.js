import { createRouter } from "next-connect";
import controller from "infra/controller";
import session from "model/session";
import currency from "model/currency";

const router = createRouter();

router.get(getHandler);

export default router.handler(controller.errorHandlers);

async function getHandler(request, response) {
  const requestSessionToken = request.cookies.session_id;
  const sessionObj = await session.findOneValidByToken(requestSessionToken);
  let currencies_list;
  if (sessionObj) {
    currencies_list = await currency.findAllAvailableOptions();
  }

  let statusCode = 200;
  return response.status(statusCode).json(currencies_list);
}
