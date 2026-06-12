#!/usr/bin/env bash
# setup.sh — bootstrap both backend and frontend

set -e

echo "=== RepoViz Setup ==="

# Backend
echo ""
echo "→ Setting up backend..."
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt --quiet

if [ ! -f .env ]; then
  cp .env.example .env
  echo "  Created backend/.env — add your GEMINI_API_KEY to enable AI features"
fi
deactivate
cd ..

# Frontend
echo ""
echo "→ Setting up frontend..."
cd frontend
npm install --silent

if [ ! -f .env.local ]; then
  cp .env.example .env.local
fi
cd ..

echo ""
echo "✓ Done! Start the app:"
echo ""
echo "  Terminal 1:  cd backend && source .venv/bin/activate && python run.py"
echo "  Terminal 2:  cd frontend && npm run dev"
echo ""
echo "  Then open http://localhost:3000"
