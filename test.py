import os

from dotenv import load_dotenv

load_dotenv(".env.development", override=False)


IS_PROD = os.environ.get("VERCEL_ENV") == "production" or os.environ.get("NODE_ENV") == "production"
test = {"host": "test", "id":12312}
print(int(os.getenv("POSTGRES_PORT")))


