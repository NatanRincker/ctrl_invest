import { createRouter } from "next-connect";
import controller from "infra/controller";
import migrator from "model/migrator";

const router = createRouter();

router.get(getHandler);
router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const migratedMigrations = await migrator.runPendingMigrations();
  let statusCode = migratedMigrations.length > 0 ? 201 : 200;

  return response.status(statusCode).json(migratedMigrations);
}

async function getHandler(request, response) {
  let pendingMigrations = await migrator.listPendingMigrations();
  let statusCode = 200;
  return response.status(statusCode).json(pendingMigrations);
}
