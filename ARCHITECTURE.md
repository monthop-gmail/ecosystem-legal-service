# Legal Service Ecosystem - Architecture Design

## Overview

ระบบ Legal Service ที่ใช้ Claude Agent SDK เป็น AI Engine
พร้อม Follow-up ผ่าน LINE LIFF และ Odoo ERP

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
│              ┌─────────────────┐               │                     │
│              │ legal-th Plugin │◄──────────────┘                     │
│              │ MCP + Skills    │                                      │
│              └────────┬────────┘                                     │
│                       │                                               │
│         ┌─────────────┼─────────────┐                                │
│         │             │             │                                │
│  ┌──────▼──────┐ ┌────▼─────┐ ┌────▼──────┐                        │
│  │ RAG Server  │ │ Odoo MCP │ │ LINE MCP  │                        │
│  │ port 8000   │ │ port 8002│ │ port 3001 │                        │
│  │ FastAPI+BM25│ │ XML-RPC  │ │ 34 tools  │                        │
│  └──────┬──────┘ └──────────┘ └───────────┘                        │
│  ┌──────▼──────┐                                                    │
│  │ ChromaDB    │                                                    │
│  │ port 8001   │                                                    │
│  └─────────────┘                                                    │
└──────────────────────────────────────────────────────────────────────┘
```

## 8 Services

| # | Service | Source | Port | Role |
|---|---------|--------|------|------|
| 1 | `line-bot` | botforge template | 3000 | LINE Webhook + Commands + Reply/Push |
| 2 | `server` | botforge template | 4096 | Claude Agent SDK + Session + SSE |
| 3 | `legal-mcp` | legal-th plugin | 4100 | MCP ตัวกลาง orchestrate tools |
| 4 | `legal-rag` | ragforge template | 8000 | RAG ค้นกฎหมายไทย |
| 5 | `line-oa-mcp` | line-oa-mcp-claude | 3001 | LINE Messaging API (34 tools) |
| 6 | `odoo-mcp` | odoo-mcp-claude | 8002 | Odoo ERP CRUD (10 tools) |
| 7 | `chromadb` | chromadb/chroma | 8001 | Vector Store |
| 8 | `tunnel` | cloudflared | — | Cloudflare Tunnel |

## Bot Service Architecture (2-Tier)

```
LINE app → Cloudflare Tunnel → LINE Bot (Bun, port 3000)
                                  ↕ HTTP fetch
                                Server (Hono + Claude Agent SDK, port 4096)
                                  ↕ query() → Anthropic API
                                Claude (sonnet, opus, haiku)
                                  ↕ MCP tools
                                legal-th / RAG / Odoo / LINE
```

### LINE Bot (`bot-service/src/index.ts`)
- LINE Webhook + signature validation (HMAC-SHA256)
- **Reply-first strategy**: `replyMessage` (ฟรี) → fallback `pushMessage` เมื่อ >30s
- Message chunking (5000 char limit + unclosed code block handling)
- Per-user request queue (ป้องกัน race condition)
- Commands: `/new`, `/abort`, `/sessions`, `/cost`, `/help`, `/about`

### Server (`bot-service/server/`)
- **`src/index.ts`** — Hono API server (routes, SSE, auth)
- **`src/claude.ts`** — Claude Agent SDK `query()` wrapper
- **`src/session.ts`** — In-memory session manager (create/resume/abort/delete)
- **`src/events.ts`** — Event bus for SSE broadcasting

### Server API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/models` | List available models |
| GET | `/event` | SSE event stream |
| POST | `/query` | Send prompt (stateless) |
| POST | `/session` | Create session |
| GET | `/session` | List sessions |
| GET | `/session/:id` | Get session details |
| GET | `/session/:id/message` | Get messages |
| POST | `/session/:id/message` | Send prompt in session |
| POST | `/session/:id/abort` | Abort active prompt |
| DELETE | `/session/:id` | Delete session |

## legal-th Plugin Structure

```
legal-th/
├── mcp-server/                  # MCP Server (Streamable HTTP)
│   ├── src/
│   │   ├── index.ts             # MCP entry (port 4100)
│   │   ├── tools/index.ts       # 7 tools (all in one file)
│   │   ├── prompts/index.ts     # 3 prompts
│   │   └── resources/index.ts   # 2 resources
│   ├── Dockerfile
│   └── package.json
│
├── skills/                      # Claude Code Skills
│   ├── legal-consult.md         # /legal-consult
│   ├── case-create.md           # /case-create
│   ├── case-follow-up.md        # /case-follow-up
│   └── legal-doc.md             # /legal-doc
│
├── knowledge/                   # เอกสารกฎหมายสำหรับ RAG ingest
│   └── labor-law/
│       └── labor-protection-act.txt
│
└── CLAUDE.md
```

## Message Flow Strategy

```
ข้อความจากลูกค้า LINE
  │
  ├─ เป็น command (/new, /help, ...) ?
  │   └─ ตอบทันทีด้วย replyMessage (ฟรี)
  │
  └─ เป็น prompt ปกติ ?
      │
      ├─ เข้า per-user queue
      ├─ ส่งไป Server → Claude Agent SDK
      ├─ Claude ตอบทัน 30 วิ ?
      │   └─ YES → replyMessage (ฟรี, ไม่กิน quota)
      │       └─ ข้อความยาว → chunk แรก reply, ที่เหลือ push
      │   └─ NO → replyToken หมดอายุ
      │       └─ fallback pushMessage ทุก chunk
      └─ done
```

## Example Flow: ลูกค้าปรึกษากฎหมาย

```
1. ลูกค้าส่งข้อความ LINE: "ถูกเลิกจ้างไม่เป็นธรรม ทำงานมา 5 ปี"
   │
2. LINE Bot → Server → Claude Agent SDK
   │
3. Claude เรียก MCP tools:
   ├─ legal_search("เลิกจ้างไม่เป็นธรรม") → RAG ค้น พ.ร.บ.คุ้มครองแรงงาน
   ├─ case_intake({type: "labor", desc: "..."}) → สร้าง Lead ใน Odoo
   └─ fee_estimate({type: "labor_unfair_dismissal"}) → ประเมินค่าบริการ
   │
4. Claude ตอบกลับ (< 30 วิ → replyMessage ฟรี):
   "ตามมาตรา 118 พ.ร.บ.คุ้มครองแรงงาน ทำงาน 5 ปี
    มีสิทธิ์ได้ค่าชดเชย 180 วัน..."
   │
5. Follow-up (3 วันหลัง):
   ├─ LINE push: "สวัสดีครับ ต้องการนัดพบทนายไหมครับ?"
   └─ Odoo: update lead stage → "Follow-up sent"
```

## Odoo Modules

| Module | ใช้ทำ |
|--------|------|
| `crm` | Lead/Opportunity = เคสที่ปรึกษา |
| `calendar` | นัดหมายพบทนาย |
| `account` | ออกใบเสนอราคา/Invoice |
| `documents` | เก็บเอกสารคดี |
| `project` | ติดตามงานคดี (Kanban) |

## Implementation Phases

### Phase 1 - Core Scaffold (Done)
- [x] Setup docker-compose ecosystem (8 services)
- [x] `legal-rag` + ingest กฎหมายแรงงาน
- [x] `legal-mcp` 7 tools, 3 prompts, 2 resources
- [x] `bot-service` LINE webhook → Claude → ตอบคำถามกฎหมาย

### Phase 1.5 - Bot Refactor (Done)
- [x] 2-tier architecture ตาม botforge template
- [x] Claude Agent SDK (query, session, abort)
- [x] Reply-first strategy (replyMessage → fallback pushMessage)
- [x] SSE event streaming
- [x] LINE commands (/new, /abort, /sessions, /cost, /help)
- [x] Message chunking + per-user queue
- [x] workspace/AGENTS.md (legal advisor persona)

### Phase 2 - Odoo Integration
- [ ] `odoo-mcp` connect → Odoo CRM
- [ ] `case_status`, `appointment`, `fee_estimate` tools → live Odoo
- [ ] LINE LIFF mini-app: ดูสถานะเคส, นัดหมาย

### Phase 3 - Follow-up & Automation
- [ ] Follow-up scheduler (cron → LINE push + Odoo update)
- [ ] `document_draft` tool → generate real legal documents
- [ ] Analytics dashboard

## Related Repositories

| Project | Description |
|---------|-------------|
| [botforge](https://github.com/monthop-gmail/botforge) | CLI สร้าง LINE Bot + AI (5 engines) |
| [ragforge](https://github.com/monthop-gmail/ragforge) | CLI สร้าง RAG Server (4 templates) |
| [line-oa-mcp-claude](https://github.com/monthop-gmail/line-oa-mcp-claude) | MCP Server for LINE Messaging API |
| [odoo-mcp-claude](https://github.com/monthop-gmail/odoo-mcp-claude) | MCP Server for Odoo ERP |
| [odoo-codespace-docker](https://github.com/monthop/odoo-codespace-docker) | Odoo Docker (ไม่ต้องใช้ VPN) |
