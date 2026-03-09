# Legal Service Ecosystem

ระบบ Legal Service ที่ใช้ AI (Claude Code) เป็นตัวกลาง
พร้อม Follow-up ผ่าน LINE LIFF และ Odoo ERP

## Services

| Service | Port | Description |
|---------|------|-------------|
| bot-service | 3000 | LINE Bot + Claude Agent SDK |
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
curl http://localhost:4100/health   # legal-mcp
curl http://localhost:8000/health   # legal-rag
curl http://localhost:3000/health   # bot-service
```

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

Modular microservices, each service is independent and communicable via MCP.
Clone dependent repos into `line-oa-mcp/` and `odoo-mcp/` directories.

## Related Repos

- https://github.com/monthop-gmail/botforge
- https://github.com/monthop-gmail/ragforge
- https://github.com/monthop-gmail/line-oa-mcp-claude
- https://github.com/monthop-gmail/odoo-mcp-claude
- https://github.com/monthop/odoo-codespace-docker
