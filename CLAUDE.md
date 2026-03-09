# Legal Service Ecosystem

ระบบ Legal Service ที่ใช้ Claude Agent SDK เป็น AI Engine
พร้อม Follow-up ผ่าน LINE LIFF และ Odoo ERP

## Services

| Service | Port | Description |
|---------|------|-------------|
| line-bot | 3000 | LINE Webhook + Commands |
| server | 4096 | Claude Code Server (Agent SDK) |
| legal-mcp | 4100 | legal-th MCP Server (orchestrator) |
| legal-rag | 8000 | RAG Server (Thai legal documents) |
| line-oa-mcp | 3001 | LINE OA Messaging MCP (34 tools) |
| odoo-mcp | 8002 | Odoo ERP MCP (CRUD) |
| chromadb | 8001 | Vector Store |

## Commands

```bash
# Start ecosystem
docker compose up --build

# Start specific service
docker compose up legal-mcp legal-rag chromadb

# Ingest legal documents
curl -X POST http://localhost:8000/api/ingest

# Health checks
curl http://localhost:4096/health   # server
curl http://localhost:3000/health   # line-bot
curl http://localhost:4100/health   # legal-mcp
curl http://localhost:8000/health   # legal-rag
```

## Bot Service (2-Tier)

```
LINE Bot (port 3000) → Server (port 4096) → Claude Agent SDK → Anthropic API
```

- `bot-service/src/index.ts` — LINE bot: webhook, commands, reply-first + push fallback
- `bot-service/server/src/index.ts` — Hono API server (routes, SSE, auth)
- `bot-service/server/src/claude.ts` — Claude Agent SDK wrapper
- `bot-service/server/src/session.ts` — Session manager (create/resume/abort)
- `bot-service/server/src/events.ts` — SSE event bus
- `workspace/AGENTS.md` — AI persona & rules for legal advisor

## MCP Tools (legal-th)

- `legal_search` - ค้นหาข้อกฎหมายไทย
- `case_intake` - รับเคสใหม่ → Odoo CRM
- `case_status` - สถานะเคส ← Odoo
- `appointment_create` - นัดหมาย → Odoo Calendar
- `document_draft` - ร่างเอกสารกฎหมาย
- `follow_up` - ตั้ง follow-up → LINE + Odoo
- `fee_estimate` - ประเมินค่าบริการ

## Skills

- `/legal-consult` - ปรึกษากฎหมาย
- `/case-create` - สร้างเคสใหม่
- `/case-follow-up` - ติดตามเคส
- `/legal-doc` - ร่างเอกสาร

## Architecture

2-Tier Bot Service (botforge template) + Modular MCP microservices.
Clone dependent repos into `line-oa-mcp/` and `odoo-mcp/` directories.

## Related Repos

- https://github.com/monthop-gmail/botforge
- https://github.com/monthop-gmail/ragforge
- https://github.com/monthop-gmail/line-oa-mcp-claude
- https://github.com/monthop-gmail/odoo-mcp-claude
- https://github.com/monthop/odoo-codespace-docker
