# api/update_public_assets.py
# pip install yfinance && pip install "psycopg[binary,pool]" && pip install python-dotenv

from http.server import BaseHTTPRequestHandler
import os, time, random, hashlib, tempfile
from dotenv import load_dotenv
from decimal import Decimal, ROUND_HALF_UP
from concurrent.futures import ThreadPoolExecutor, as_completed

import psycopg  # psycopg[binary]
import yfinance as yf



IS_PROD = (os.getenv("VERCEL_ENV") == "production") or (os.getenv("NODE_ENV") == "production")
if not IS_PROD:
    load_dotenv(".env.development")
# ---- Auth (only allow Vercel Cron / you) ------------------------------------
def _authorized(headers) -> bool:
    if IS_PROD:
        CRON_SECRET =os.getenv("CRON_SECRET")
        auth = headers.get('authorization') or headers.get('Authorization')
        return bool(CRON_SECRET) and auth == f"Bearer {CRON_SECRET}"
    else:
        return True

# ---- Config knobs (tune in Vercel env) --------------------------------------
#DB_URL = os.environ["DATABASE_URL"]
def ssl_kwargs_from_env():
    pem  = os.getenv("POSTGRES_CA")
    if not pem:
        return {"sslmode": "disable"}

    ca_path = os.path.join(tempfile.gettempdir(), "pg-ca.pem")
    tmp_path = ca_path + ".tmp"

    # Only rewrite if contents differ (cheap hash compare)
    def _sha256(s: str) -> str:
        return hashlib.sha256(s.encode("utf-8")).hexdigest()

    new_hash = _sha256(pem)
    old_hash = None
    try:
        with open(ca_path, "r", encoding="utf-8", newline="\n") as f:
            old_hash = _sha256(f.read())
    except FileNotFoundError:
        pass

    if new_hash != old_hash:
        # Atomic replace so readers never see a half-written file
        with open(tmp_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(pem)
        os.replace(tmp_path, ca_path)


    return {"sslmode": "verify-full", "sslrootcert": ca_path}

DB_CONNECTION =  {
    "host": os.getenv("POSTGRES_HOST"),
    "port": os.getenv("POSTGRES_PORT"),
    "dbname": os.getenv("POSTGRES_DB"),
    "user": os.getenv("POSTGRES_USER"),
    "password": os.getenv("POSTGRES_PASSWORD")
}

# Process tickers in batches to pace outbound calls
BATCH_SIZE   = int(os.environ.get("YF_BATCH_SIZE", "400"))     # ~15 batches for 6k
MAX_WORKERS  = int(os.environ.get("YF_MAX_WORKERS", "24"))     # parallel per batch
RETRIES      = int(os.environ.get("YF_RETRIES", "3"))
SLEEP_MIN    = float(os.environ.get("YF_SLEEP_MIN", "0.05"))   # jitter between batches
SLEEP_MAX    = float(os.environ.get("YF_SLEEP_MAX", "0.20"))

# Optional sharding (useful if you split into multiple cron invocations)
SHARDS       = int(os.environ.get("SHARDS", "1"))              # e.g., 3
THIS_SHARD   = int(os.environ.get("THIS_SHARD", "0"))          # 0..SHARDS-1

def _q8(x: float) -> Decimal:
    return Decimal(str(x)).quantize(Decimal("0.00000001"))

def _shard_of(code: str) -> int:
    if SHARDS <= 1: return 0
    h = int(hashlib.sha1(code.encode()).hexdigest(), 16)
    return h % SHARDS

def _load_codes(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT code FROM public_assets
            WHERE yfinance_compatible = TRUE
        """)
        rows = [r[0] for r in cur.fetchall()]
    if SHARDS > 1:
        rows = [c for c in rows if _shard_of(c) == THIS_SHARD]
    return rows

def _fast_price_one(symbol: str) -> tuple[str, float | None]:
    """
    Fetch last price using yfinance fast_info only.
    Retries with small backoff. Returns (symbol, price|None).
    """
    for attempt in range(1, RETRIES + 1):
        try:
            fi = yf.Ticker(symbol).fast_info  # dict-like
            if fi:
                v = fi.get("lastPrice")
                if v is None:
                    # Some builds expose snake_case keys:
                    v = fi.get("last_price") or fi.get("last_trade_price")
                if v is not None:
                    v = float(v)
                    if v > 0:
                        return symbol, v
        except Exception:
            pass
        time.sleep(min(0.25 * attempt + random.random() * 0.25, 1.0))
    return symbol, None

def _fetch_batch_fast_prices(symbols: list[str]) -> dict[str, float]:
    """
    Resolve lastPrice for a batch in parallel (threads).
    """
    out: dict[str, float] = {}
    if not symbols:
        return out
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futures = {ex.submit(_fast_price_one, s): s for s in symbols}
        for fut in as_completed(futures):
            s, price = fut.result()
            if price is not None:
                out[s] = price
    return out

def _bulk_update_prices(conn, price_map: dict[str, float]) -> int:
    """
    COPY into temp table then UPDATE…FROM for speed & atomicity.
    """
    rows = [(code, _q8(val)) for code, val in price_map.items()]
    if not rows:
        return 0
    with conn.cursor() as cur:
        cur.execute("CREATE TEMP TABLE _prices(code text PRIMARY KEY, price numeric(19,8));")
        with cur.copy("COPY _prices (code, price) FROM STDIN WITH (FORMAT CSV)") as cp:
            for code, price in rows:
                cp.write_row((code, str(price)))
        cur.execute("""
            UPDATE public_assets pa
            SET market_value = p.price,
                updated_date = timezone('utc', now())
            FROM _prices p
            WHERE pa.code = p.code;
        """)
    return len(rows)

def _batched(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i+n]

class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        if not _authorized(self.headers):
            self.send_response(401); self.end_headers()
            print("Unauthorized")
            self.wfile.write(b"Unauthorized"); return

        try:
            total_updated = 0
            with psycopg.connect(**DB_CONNECTION, **ssl_kwargs_from_env()) as conn:
                codes = _load_codes(conn)
                for batch in _batched(codes, BATCH_SIZE):
                    prices = _fetch_batch_fast_prices(batch)   # lastPrice only
                    if prices:
                        total_updated += _bulk_update_prices(conn, prices)
                    # small jitter between batches to avoid bursts
                    time.sleep(random.uniform(SLEEP_MIN, SLEEP_MAX))
                conn.commit()

            self.send_response(200); self.end_headers()
            self.wfile.write(f"OK updated={total_updated} shard={THIS_SHARD}/{SHARDS}".encode())
            print(f"OK updated={total_updated} shard={THIS_SHARD}/{SHARDS}")
        except Exception as e:
            self.send_response(500); self.end_headers()
            self.wfile.write(f"ERR: {e}".encode())
            print(f"ERR: {e}".encode())
