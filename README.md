# Ecosystem Legal Service

**ระบบที่ปรึกษากฎหมายไทย AI** — Legal Service Ecosystem ที่ใช้ Claude Agent SDK เป็น AI Engine พร้อม Follow-up ผ่าน LINE LIFF และ Odoo ERP

```
ลูกค้า LINE → LINE Bot (port 3000) → Claude Code Server (port 4096)
                                        ↕ Claude Agent SDK
                                      Claude AI + legal-th Plugin
                                        ↕ MCP Tools
                                   RAG กฎหมาย + Odoo CRM
```

---

## Features

- **AI ที่ปรึกษากฎหมาย** — ให้คำปรึกษาเบื้องต้น อ้างอิงมาตรากฎหมายไทย
- **Claude Agent SDK** — Agentic loop, tool use, session resume, cost tracking
- **2-Tier Architecture** — LINE Bot แยกจาก AI Server ตาม [botforge](https://github.com/monthop-gmail/botforge) template
- **Reply-first Strategy** — ใช้ replyMessage (ฟรี) เป็นหลัก, fallback pushMessage เมื่อ timeout
- **7 MCP Tools** — ค้นกฎหมาย, รับเคส, สถานะ, นัดหมาย, ร่างเอกสาร, follow-up, ประเมินค่าบริการ
- **4 Skills** — `/legal-consult`, `/case-create`, `/case-follow-up`, `/legal-doc`
- **RAG Search** — Hybrid search (Vector + BM25) บนฐานข้อมูลกฎหมายไทย
- **LINE Commands** — `/new`, `/abort`, `/sessions`, `/cost`, `/help`, `/about`
- **SSE Streaming** — Real-time event stream สำหรับ client อื่นๆ
- **LINE Integration** — รับ-ตอบผ่าน LINE OA, message chunking (5000 char limit)
- **Odoo ERP** — CRM, Calendar, Invoice, Project tracking
- **Modular Architecture** — แต่ละ service เป็น Docker container อิสระ

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    LEGAL SERVICE ECOSYSTEM                           │
│                                                                      │
│  ┌──────────┐    ┌─────────────────────────────────────────────┐    │
│  │ LINE OA  │    │  Bot Service (2-Tier)                       │    │
│  │ + LIFF   │◄──►│  ┌────────────┐    ┌─────────────────────┐ │    │
│  │ (Client) │    │  │ LINE Bot   │───►│ Claude Code Server  │ │    │
│  └──────────┘    │  │ port 3000  │    │ port 4096           │ │    │
│                  │  │ replyMsg   │    │ Agent SDK + SSE     │ │    │
│                  │  │ + pushMsg  │    │ Session Management  │ │    │
│                  │  └────────────┘    └────────┬────────────┘ │    │
│                  └─────────────────────────────┼───────────────┘    │
│                                                │                     │
│                  ┌─────────────────────────────┼───────────────┐    │
│                  │  legal-th Plugin             │               │    │
│                  │  ┌────────────┐  ┌──────────▼────────────┐ │    │
│                  │  │ Skills     │  │ MCP Server (port 4100)│ │    │
│                  │  │ 4 commands │  │ 7 tools, 3 prompts    │ │    │
│                  │  └────────────┘  └──────────┬────────────┘ │    │
│                  │                              │               │    │
│                  │  ┌───────────────────────────┼─────────┐    │    │
│                  │  │  knowledge/               │          │    │    │
│                  │  │  กฎหมายไทย (RAG ingest)    │          │    │    │
│                  │  └───────────────────────────┼─────────┘    │    │
│                  └─────────────────────────────┼───────────────┘    │
│                                ┌───────────────┼───────────┐        │
│                                │               │           │        │
│                  ┌─────────────▼──┐  ┌─────────▼───┐  ┌────▼─────┐ │
│                  │ RAG Server     │  │ Odoo MCP    │  │ LINE MCP │ │
│                  │ port 8000      │  │ port 8002   │  │ port 3001│ │
│                  │ FastAPI+BM25   │  │ XML-RPC     │  │ 34 tools │ │
│                  └───────┬────────┘  └─────────────┘  └──────────┘ │
│                  ┌───────▼────────┐                                  │
│                  │ ChromaDB       │                                  │
│                  │ port 8001      │                                  │
│                  └────────────────┘                                  │
└──────────────────────────────────────────────────────────────────────┘
```

## Services

| Service | Port | Description | Tech |
|---------|------|-------------|------|
| `line-bot` | 3000 | LINE Webhook + Commands | Bun, LINE SDK |
| `server` | 4096 | Claude Code API Server | Bun, Hono, Agent SDK |
| `legal-mcp` | 4100 | legal-th MCP Server | Node, MCP SDK, Zod |
| `legal-rag` | 8000 | RAG กฎหมายไทย | FastAPI, ChromaDB, BM25 |
| `line-oa-mcp` | 3001 | LINE Messaging MCP | Node, MCP SDK, LINE SDK |
| `odoo-mcp` | 8002 | Odoo ERP MCP | Python, XML-RPC |
| `chromadb` | 8001 | Vector Store | ChromaDB |
| `tunnel` | — | Cloudflare Tunnel | cloudflared |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Bun / Node.js 22+
- Python 3.11+
- LINE OA account + Messaging API
- Anthropic API key (or Claude OAuth)

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
# Add: ANTHROPIC_API_KEY, LINE credentials, Odoo credentials
```

### 3. Run

```bash
# Start all services
docker compose up --build

# Ingest legal documents
curl -X POST http://localhost:8000/api/ingest

# Health checks
curl http://localhost:4096/health   # server (Claude Code)
curl http://localhost:3000/health   # line-bot
curl http://localhost:4100/health   # legal-mcp
curl http://localhost:8000/health   # legal-rag
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
├── bot-service/                 # Bot Service (2-Tier)
│   ├── src/index.ts             # LINE Bot: webhook, commands, reply/push
│   ├── server/                  # Claude Code Server
│   │   └── src/
│   │       ├── index.ts         # Hono API (10 endpoints + SSE)
│   │       ├── claude.ts        # Claude Agent SDK wrapper
│   │       ├── session.ts       # Session lifecycle management
│   │       └── events.ts        # SSE event bus
│   ├── Dockerfile               # LINE Bot container
│   └── server/Dockerfile        # Server container
│
├── legal-th/                    # Core Plugin
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
│       └── labor-law/
│
├── legal-rag/                   # RAG Server (FastAPI + ChromaDB + BM25)
├── workspace/AGENTS.md          # AI persona & rules (legal advisor)
├── line-oa-mcp/                 # → clone line-oa-mcp-claude
├── odoo-mcp/                    # → clone odoo-mcp-claude
├── docker-compose.yml           # 8 services ecosystem
├── .mcp.json                    # MCP server config
└── ARCHITECTURE.md              # Detailed architecture doc
```

## Bot Service Architecture

```
LINE app → Cloudflare Tunnel → LINE Bot (Bun, port 3000)
                                  ↕ HTTP fetch
                                Server (Hono + Claude Agent SDK, port 4096)
                                  ↕ query() → Anthropic API
                                Claude (sonnet, opus, haiku)
```

### LINE Bot (`bot-service/src/index.ts`)
- Webhook + signature validation
- **Reply-first strategy**: ใช้ `replyMessage` (ฟรี) ก่อน, fallback `pushMessage` เมื่อ timeout >30s
- Message chunking (LINE limit 5000 chars + code block handling)
- Per-user request queue (ป้องกัน race condition)
- Commands: `/new`, `/abort`, `/sessions`, `/cost`, `/help`, `/about`

### Server (`bot-service/server/`)
- Claude Agent SDK `query()` with agentic loop
- Full session management (create/resume/abort/delete)
- SSE event streaming (`/event`)
- REST API: 10 endpoints
- Configurable: model, max_turns, max_budget
- Auth: API key or OAuth (`~/.claude` mount)

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

## LINE Bot Commands

| Command | Description |
|---------|-------------|
| `/help` | คำสั่งทั้งหมด |
| `/about` | แนะนำตัว bot |
| `/new` | เริ่มบทสนทนาใหม่ |
| `/abort` | ยกเลิก prompt ที่กำลังทำ |
| `/sessions` | ดูสถานะ session + cost |
| `/cost` | ดูค่าใช้จ่ายรวม |

## Server API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/models` | List available models |
| GET | `/event` | SSE event stream |
| POST | `/query` | Send prompt (stateless) |
| POST | `/session` | Create session |
| GET | `/session` | List sessions |
| GET | `/session/:id` | Get session details |
| GET | `/session/:id/message` | Get session messages |
| POST | `/session/:id/message` | Send prompt in session |
| POST | `/session/:id/abort` | Abort active prompt |
| DELETE | `/session/:id` | Delete session |

## Example Flow

```
1. ลูกค้าส่ง LINE: "ถูกเลิกจ้างไม่เป็นธรรม ทำงานมา 5 ปี"

2. LINE Bot → Server → Claude Agent SDK:
   ├─ legal_search("เลิกจ้างไม่เป็นธรรม")
   │   → พ.ร.บ.คุ้มครองแรงงาน มาตรา 118, 119
   ├─ fee_estimate({type: "labor", service: "consultation"})
   │   → ประเมิน 3,000 บาท
   └─ case_intake({name: "...", type: "labor"})
       → สร้าง Lead ใน Odoo

3. ตอบกลับ LINE (replyMessage ฟรี):
   "ตามมาตรา 118 ทำงาน 5 ปี มีสิทธิ์ได้ค่าชดเชย 180 วัน..."

4. ถ้า Claude ใช้เวลานาน (>30s):
   replyToken หมดอายุ → fallback pushMessage

5. Follow-up อัตโนมัติ (3 วันหลัง):
   LINE push → "สนใจนัดพบทนายไหมครับ?"
```

## Environment Variables

### LINE Bot
| Variable | Description | Default |
|----------|-------------|---------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API token | required |
| `LINE_CHANNEL_SECRET` | LINE channel secret | required |
| `SERVER_URL` | Server API URL | `http://server:4096` |
| `SERVER_PASSWORD` | Server auth password | optional |
| `PROMPT_TIMEOUT_MS` | Timeout per prompt | `300000` |

### Server
| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | API key (or use OAuth) | optional |
| `CLAUDE_HOME` | Path to `~/.claude` for OAuth | `~/.claude` |
| `API_PASSWORD` | API auth password | optional |
| `CLAUDE_MODEL` | Model: sonnet/opus/haiku | `sonnet` |
| `CLAUDE_MAX_TURNS` | Max agentic turns | `10` |
| `CLAUDE_MAX_BUDGET_USD` | Max spend per prompt | `1.00` |

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
- [x] **Phase 1.5** — Bot refactor: 2-tier architecture, Agent SDK, reply-first
- [ ] **Phase 2** — Odoo integration (CRM, Calendar, Invoice)
- [ ] **Phase 3** — Follow-up automation (Scheduler + LINE push)
- [ ] **Phase 4** — LINE LIFF mini-app (สถานะเคส, นัดหมาย)
- [ ] **Phase 5** — Multi-language support (EN, TH)
- [ ] **Phase 6** — Analytics dashboard

## License

[MIT](LICENSE)

---

Built with [Claude Code](https://claude.ai/claude-code) | Powered by [Anthropic](https://anthropic.com)
