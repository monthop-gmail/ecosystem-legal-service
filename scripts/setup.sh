#!/bin/bash
# Legal Service Ecosystem - Setup Script

set -e

echo "🏛️ Legal Service Ecosystem Setup"
echo "================================"

# 1. Clone dependent repos
echo ""
echo "📥 Cloning dependent repositories..."

if [ ! -d "line-oa-mcp/.git" ]; then
  git clone https://github.com/monthop-gmail/line-oa-mcp-claude.git line-oa-mcp
  echo "  ✓ line-oa-mcp-claude"
else
  echo "  ⊘ line-oa-mcp already exists"
fi

if [ ! -d "odoo-mcp/.git" ]; then
  git clone https://github.com/monthop-gmail/odoo-mcp-claude.git odoo-mcp
  echo "  ✓ odoo-mcp-claude"
else
  echo "  ⊘ odoo-mcp already exists"
fi

# 2. Create .env if not exists
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ""
  echo "📝 Created .env from .env.example"
  echo "   Please edit .env with your credentials"
else
  echo ""
  echo "⊘ .env already exists"
fi

# 3. Install dependencies
echo ""
echo "📦 Installing dependencies..."

# legal-th MCP
cd legal-th/mcp-server
npm install
npm run build
cd ../..
echo "  ✓ legal-th MCP built"

# bot-service
cd bot-service
bun install 2>/dev/null || npm install
cd ..
echo "  ✓ bot-service dependencies installed"

# legal-rag
cd legal-rag
pip install -r requirements.txt -q 2>/dev/null || python3 -m pip install -r requirements.txt -q
cd ..
echo "  ✓ legal-rag dependencies installed"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your API keys"
echo "  2. Add legal documents to legal-th/knowledge/"
echo "  3. Run: docker compose up --build"
echo "  4. Ingest documents: curl -X POST http://localhost:8000/api/ingest"
