#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR/web"
if [ ! -d "node_modules" ]; then
  npm install
fi

echo "Starting ML-first wildfire app on http://localhost:3000"
npm run dev
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Starting Python analytics API..."
cd "$ROOT_DIR/services/python-api"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r requirements.txt >/dev/null
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload &
API_PID=$!

echo "Starting Next.js dashboard..."
cd "$ROOT_DIR/web"
npm install >/dev/null
npm run dev &
WEB_PID=$!

echo "Dashboard: http://localhost:3000"
echo "API: http://localhost:8000"
echo "Press Ctrl+C to stop."

cleanup() {
  kill "$API_PID" "$WEB_PID" >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM
wait
