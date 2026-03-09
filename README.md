# Ecosystem Legal Service

**ระบบที่ปรึกษากฎหมายไทย AI** — Legal Service Ecosystem ที่ใช้ Claude Code เป็นตัวกลาง พร้อม Follow-up ผ่าน LINE LIFF และ Odoo ERP

```
ลูกค้า LINE → Bot Service → Claude Code + legal-th Plugin → RAG กฎหมาย + Odoo CRM
```

---

## Features

- **AI ที่ปรึกษากฎหมาย** — ให้คำปรึกษาเบื้องต้น อ้างอิงมาตรากฎหมายไทย
- **7 MCP Tools** — ค้นกฎหมาย, รับเคส, สถานะ, นัดหมาย, ร่างเอกสาร, follow-up, ประเมินค่าบริการ
- **4 Skills** — `/legal-consult`, `/case-create`, `/case-follow-up`, `/legal-doc`
- **RAG Search** — Hybrid search (Vector + BM25) บนฐานข้อมูลกฎหมายไทย
- **LINE Integration** — รับ-ตอบผ่าน LINE OA, follow-up push message
- **Odoo ERP** — CRM, Calendar, Invoice, Project tracking
- **Modular Architecture** — แต่ละ service เป็น Docker container อิสระ

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LEGAL SERVICE ECOSYSTEM                          │
│                                                                     │
│  ┌──────────┐    ┌──────────────────┐    ┌───────────────────────┐ │
│  │ LINE OA  │◄──►│                  │◄──►│  Odoo ERP             │ │
│  │ + LIFF   │    │  Claude Code      │    │  (CRM/Case/Invoice)   │ │
│  │ (Client) │    │  (Orchestrator)   │    │  odoo-mcp-claude      │ │
│  └──────────┘    │                  │    └───────────────────────┘ │
│                  │  ┌────────────┐  │                               │
│  ┌──────────┐    │  │ legal-th   │  │    ┌───────────────────────┐ │
│  │ Bot      │◄──►│  │ Plugin     │  │◄──►│  RAG Server           │ │
│  │ Service  │    │  │ (MCP+Skill)│  │    │  (กฎหมายไทย)           │ │
│  │ botforge │    │  └────────────┘  │    │  ragforge              │ │
│  └──────────┘    └──────────────────┘    └───────────────────────┘ │
│                           │                                         │
│                  ┌────────┴────────┐                                │
│                  │  Follow-up      │                                │
│                  │  Scheduler      │                                │
│                  │  (Cron/Queue)   │                                │
│                  └─────────────────┘                                │
└─────────────────────────────────────────────────────────────────────┘
```

## Services

| Service | Port | Description | Tech |
|---------|------|-------------|------|
| `bot-service` | 3000 | LINE Bot + AI | Bun, Hono, LINE SDK |
| `legal-mcp` | 4100 | legal-th MCP Server | Node, MCP SDK, Zod |
| `legal-rag` | 8000 | RAG กฎหมายไทย | FastAPI, ChromaDB, BM25 |
| `line-oa-mcp` | 3001 | LINE Messaging MCP | Node, MCP SDK, LINE SDK |
| `odoo-mcp` | 8002 | Odoo ERP MCP | Python, XML-RPC |
| `chromadb` | 8001 | Vector Store | ChromaDB |
| `tunnel` | — | Cloudflare Tunnel | cloudflared |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 22+ / Bun
- Python 3.11+
- LINE OA account + Messaging API
- Anthropic API key

### 1. Clone & Setup

```bash
git clone https://github.com/monthop-gmail/ecosystem-legal-service.git
cd ecosystem-legal-service

# Clone dependent repos + install deps
./scripts/setup.sh
```

### 2. Configure

```bash
cp .env.example .env
nano .env
# Add your API keys: ANTHROPIC_API_KEY, LINE credentials, Odoo credentials
```

### 3. Run

```bash
# Start all services
docker compose up --build

# Ingest legal documents
curl -X POST http://localhost:8000/api/ingest

# Health checks
curl http://localhost:4100/health   # legal-mcp
curl http://localhost:8000/health   # legal-rag
curl http://localhost:3000/health   # bot-service
```

### 4. Use with Claude Code

```bash
# Claude Code will auto-detect .mcp.json
claude

# Use skills
/legal-consult
/case-create
/case-follow-up
/legal-doc
```

## Project Structure

```
ecosystem-legal-service/
├── legal-th/                    # ⭐ Core Plugin
│   ├── mcp-server/              # MCP Server (7 tools, 3 prompts, 2 resources)
│   │   └── src/
│   │       ├── tools/           # legal_search, case_intake, case_status, ...
│   │       ├── prompts/         # thai-legal-advisor, case-summarizer, ...
│   │       └── resources/       # legal-categories, fee-schedule
│   ├── skills/                  # Claude Code slash commands
│   │   ├── legal-consult.md
│   │   ├── case-create.md
│   │   ├── case-follow-up.md
│   │   └── legal-doc.md
│   └── knowledge/               # กฎหมายไทยสำหรับ RAG
│       ├── labor-law/
│       ├── civil-code/
│       ├── criminal-code/
│       ├── land-law/
│       └── consumer-protection/
├── bot-service/                 # LINE Bot (Bun + Hono)
├── legal-rag/                   # RAG Server (FastAPI + ChromaDB)
├── line-oa-mcp/                 # → clone line-oa-mcp-claude
├── odoo-mcp/                    # → clone odoo-mcp-claude
├── scripts/                     # Setup & utility scripts
├── docker-compose.yml           # Full ecosystem
├── .mcp.json                    # MCP server config
└── ARCHITECTURE.md              # Detailed architecture doc
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `legal_search` | ค้นหาข้อกฎหมายไทย (มาตรา, พ.ร.บ., คำพิพากษา) |
| `case_intake` | รับเคสใหม่ → สร้าง Lead ใน Odoo CRM |
| `case_status` | ตรวจสอบสถานะเคส/คดี จาก Odoo |
| `appointment_create` | นัดหมายพบทนาย → Odoo Calendar |
| `document_draft` | ร่างเอกสารกฎหมาย (สัญญา, หนังสือทวงถาม, มอบอำนาจ) |
| `follow_up` | ตั้ง follow-up → LINE push + Odoo update |
| `fee_estimate` | ประเมินค่าบริการทางกฎหมายเบื้องต้น |

## Example Flow

```
1. ลูกค้าส่ง LINE: "ถูกเลิกจ้างไม่เป็นธรรม ทำงานมา 5 ปี"

2. Claude Code วิเคราะห์ + เรียก MCP tools:
   ├─ legal_search("เลิกจ้างไม่เป็นธรรม")
   │   → พ.ร.บ.คุ้มครองแรงงาน มาตรา 118, 119
   ├─ fee_estimate({type: "labor", service: "consultation"})
   │   → ประเมิน 3,000 บาท
   └─ case_intake({name: "...", type: "labor"})
       → สร้าง Lead ใน Odoo

3. ตอบกลับ LINE:
   "ตามมาตรา 118 ทำงาน 5 ปี มีสิทธิ์ได้ค่าชดเชย 180 วัน..."
   + ปุ่ม "นัดพบทนาย" / "ดูค่าบริการ"

4. Follow-up อัตโนมัติ (3 วันหลัง):
   LINE push → "สนใจนัดพบทนายไหมครับ?"
```

## Related Projects

| Project | Description |
|---------|-------------|
| [botforge](https://github.com/monthop-gmail/botforge) | CLI สร้าง LINE Bot + AI (5 engines) |
| [ragforge](https://github.com/monthop-gmail/ragforge) | CLI สร้าง RAG Server (4 templates) |
| [line-oa-mcp-claude](https://github.com/monthop-gmail/line-oa-mcp-claude) | MCP Server for LINE Messaging API |
| [odoo-mcp-claude](https://github.com/monthop-gmail/odoo-mcp-claude) | MCP Server for Odoo ERP |
| [odoo-codespace-docker](https://github.com/monthop/odoo-codespace-docker) | Odoo Docker (ไม่ต้องใช้ VPN) |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Areas to Contribute

- **กฎหมาย** — เพิ่มเอกสารกฎหมายใน `legal-th/knowledge/`
- **MCP Tools** — เพิ่ม tools ใหม่ใน `legal-th/mcp-server/src/tools/`
- **Skills** — เพิ่ม slash commands ใน `legal-th/skills/`
- **Prompts** — ปรับปรุง system prompts ใน `legal-th/mcp-server/src/prompts/`
- **LINE LIFF** — สร้าง mini-app สำหรับดูสถานะเคส
- **Odoo Modules** — เพิ่ม custom modules สำหรับ legal workflow
- **Documentation** — แปลเอกสาร, เขียน tutorial
- **Testing** — เพิ่ม test cases

## Roadmap

- [x] **Phase 1** — Core scaffold (MCP + RAG + Bot)
- [ ] **Phase 2** — Odoo integration (CRM, Calendar, Invoice)
- [ ] **Phase 3** — Follow-up automation (Scheduler + LINE push)
- [ ] **Phase 4** — LINE LIFF mini-app (สถานะเคส, นัดหมาย)
- [ ] **Phase 5** — Multi-language support (EN, TH)
- [ ] **Phase 6** — Analytics dashboard

## License

[MIT](LICENSE)

---

Built with [Claude Code](https://claude.ai/claude-code) | Powered by [Anthropic](https://anthropic.com)
