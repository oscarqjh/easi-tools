#!/bin/bash
# easi-monitor startup script
# Run this from any container with access to /mnt/aigc and /mnt/umm shared storage.
#
# Usage:
#   bash /mnt/umm/users/qianjianheng/workspace/EASI/easi-tools/easi-monitor/start.sh
#   bash /mnt/umm/users/qianjianheng/workspace/EASI/easi-tools/easi-monitor/start.sh --port 3001
#
# Then open http://localhost:<port> in your browser (via SSH port forward or directly).

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${1:-3000}"

# Handle --port flag
if [ "$1" = "--port" ] && [ -n "$2" ]; then
    PORT="$2"
fi

# Use qianjianheng's Node.js from shared storage
NODE_DIR="/mnt/aigc/users/qianjianheng/.nvm/versions/node/v24.13.0"
if [ ! -f "$NODE_DIR/bin/node" ]; then
    echo "Error: Node.js not found at $NODE_DIR"
    echo "Please install Node.js or ask qianjianheng for access."
    exit 1
fi

export PATH="$NODE_DIR/bin:$PATH"

echo "============================================"
echo "  easi-monitor"
echo "============================================"
echo ""
echo "  Node:    $(node --version)"
echo "  Port:    $PORT"
echo "  Dir:     $SCRIPT_DIR"
echo ""
echo "  Access:  http://localhost:$PORT"
echo ""
echo "  If accessing from your laptop, forward the port:"
echo "    ssh -L $PORT:localhost:$PORT <your-container>"
echo ""
echo "  Press Ctrl+C to stop."
echo "============================================"
echo ""

cd "$SCRIPT_DIR"
npx next start --hostname 0.0.0.0 --port "$PORT" 2>/dev/null || npm run dev -- --hostname 0.0.0.0 --port "$PORT"
