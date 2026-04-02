#!/bin/bash

# ============================================================
# Speaches STT Server - Start Script
# Optimized for Apple Silicon (M-series)
# ============================================================

MODEL_API_KEY=$(grep MODEL_API_KEY .env | cut -d '=' -f2)

# ── Config ───────────────────────────────────────────────────
API_KEY="${MODEL_API_KEY:-}"
PORT="${PORT:-8000}"
HOST="${HOST:-0.0.0.0}"
LOG_LEVEL="${LOG_LEVEL:-info}"
ALLOW_ORIGINS="${ALLOW_ORIGINS:-[\"http://localhost:3000\"]}"
SPEACHES_DIR="${SPEACHES_DIR:-$HOME/speaches}"

# Models to preload on startup (comma separated JSON array)
PRELOAD_MODELS="${PRELOAD_MODELS:-[\"Systran/faster-whisper-large-v3\"]}"

# Apple Silicon — use MPS (Metal Performance Shaders) for GPU acceleration
# Falls back to CPU automatically if MPS unavailable
INFERENCE_DEVICE="${INFERENCE_DEVICE:-auto}"

# int8 is best for Apple Silicon — fast and memory efficient
COMPUTE_TYPE="${COMPUTE_TYPE:-int8}"

# Keep model loaded forever (no unload after inactivity)
STT_MODEL_TTL="${STT_MODEL_TTL:--1}"

# Number of parallel workers (1 is stable for single-GPU/MPS)
NUM_WORKERS="${NUM_WORKERS:-1}"
# ─────────────────────────────────────────────────────────────

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${GREEN}🎙  Speaches STT Server${NC}"
echo "────────────────────────────────"

# ── Check uv is installed ────────────────────────────────────
if ! command -v uv &> /dev/null; then
  echo -e "${RED}✗ uv not found. Install it with:${NC}"
  echo "  brew install uv"
  exit 1
fi
echo -e "${GREEN}✓ uv found${NC}"

# ── Clone speaches if not already present ────────────────────
if [ ! -d "$SPEACHES_DIR" ]; then
  echo -e "${YELLOW}→ Cloning speaches into $SPEACHES_DIR...${NC}"
  git clone https://github.com/speaches-ai/speaches.git "$SPEACHES_DIR"
else
  echo -e "${GREEN}✓ speaches directory found at $SPEACHES_DIR${NC}"
fi

cd "$SPEACHES_DIR"

# ── Install/sync dependencies ────────────────────────────────
echo -e "${YELLOW}→ Syncing dependencies with uv...${NC}"
uv python install
uv venv --quiet
source .venv/bin/activate
uv sync --quiet
echo -e "${GREEN}✓ Dependencies ready${NC}"

# ── Summary ─────────────────────────────────────────────────
echo ""
echo "  Host:             $HOST:$PORT"
echo "  Inference device: $INFERENCE_DEVICE (MPS on Apple Silicon)"
echo "  Compute type:     $COMPUTE_TYPE"
echo "  Model TTL:        $STT_MODEL_TTL (${STT_MODEL_TTL:--1} = never unload)"
echo "  Preload models:   $PRELOAD_MODELS"
echo "  Allow origins:    $ALLOW_ORIGINS"
echo "  API key:          $([ -n "$API_KEY" ] && echo "set" || echo "not set (open access)")"
echo ""

# ── Start server ─────────────────────────────────────────────
echo -e "${GREEN}→ Starting Speaches...${NC}"
echo ""

UVICORN_HOST="$HOST" \
UVICORN_PORT="$PORT" \
LOG_LEVEL="$LOG_LEVEL" \
API_KEY="$API_KEY" \
ALLOW_ORIGINS="$ALLOW_ORIGINS" \
PRELOAD_MODELS="$PRELOAD_MODELS" \
STT_MODEL_TTL="$STT_MODEL_TTL" \
WHISPER__INFERENCE_DEVICE="$INFERENCE_DEVICE" \
WHISPER__COMPUTE_TYPE="$COMPUTE_TYPE" \
WHISPER__NUM_WORKERS="$NUM_WORKERS" \
uvicorn --factory \
  --host "$HOST" \
  --port "$PORT" \
  --log-level "$LOG_LEVEL" \
  speaches.main:create_app