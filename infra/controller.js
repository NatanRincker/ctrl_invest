import session from "model/session";
import * as cookie from "cookie";
import {
  InternalServerError,
  MethodNotAllowedError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} from "infra/errors";

function onNoMatchHandler(request, response) {
  const publicErrorObject = new MethodNotAllowedError();
  response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

function onErrorHandler(error, request, response) {
  console.error(error);
  if (
    error instanceof MethodNotAllowedError ||
    error instanceof ValidationError ||
    error instanceof NotFoundError ||
    error instanceof UnauthorizedError
  ) {
    return response.status(error.statusCode).json(error);
  }
  const publicErrorObject = new InternalServerError({
    cause: error,
  });
  console.error(publicErrorObject);
  response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

async function setSessionCookie(sessionToken, response) {
  const setCookie = cookie.serialize("session_id", sessionToken, {
    path: "/",
    maxAge: session.TIMEOUT_IN_MILISECONDS / 1000,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
  return response.setHeader("Set-Cookie", setCookie);
}

const controller = {
  errorHandlers: {
    onNoMatch: onNoMatchHandler,
    onError: onErrorHandler,
  },
  setSessionCookie,
};
export default controller;
