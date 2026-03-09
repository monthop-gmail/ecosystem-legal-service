# Legal Service Ecosystem - Architecture Design

## Overview

ระบบ Legal Service ที่ใช้ AI (Claude Code) เป็นตัวกลางสื่อสาร
พร้อม Follow-up ผ่าน LINE LIFF และ Odoo ERP

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

## 5 Services

| # | Service | Source | Port | Role |
|---|---------|--------|------|------|
| 1 | `bot-service` | botforge (claude-code engine) | 3000 | LINE Webhook + Claude Agent SDK |
| 2 | `legal-mcp` | legal-th plugin (ใหม่) | 4100 | MCP ตัวกลาง orchestrate tools |
| 3 | `legal-rag` | ragforge (template 4 - Claude) | 8000 | RAG ค้นกฎหมายไทย |
| 4 | `line-oa-mcp` | line-oa-mcp-claude | 3001 | LINE Messaging API (34 tools) |
| 5 | `odoo-mcp` | odoo-mcp-claude | 8002 | Odoo ERP CRUD (10 tools) |

## legal-th Plugin Structure

```
legal-th/
├── mcp-server/                  # MCP Server (Streamable HTTP)
│   ├── src/
│   │   ├── index.ts             # MCP entry
│   │   ├── tools/
│   │   │   ├── case-intake.ts       # รับเคสใหม่
│   │   │   ├── legal-search.ts      # ค้นกฎหมาย (proxy → RAG)
│   │   │   ├── case-status.ts       # สถานะเคส (proxy → Odoo)
│   │   │   ├── appointment.ts       # นัดหมาย (proxy → Odoo Calendar)
│   │   │   ├── document-draft.ts    # ร่างเอกสารกฎหมาย
│   │   │   ├── follow-up.ts         # ตั้ง follow-up (→ LINE + Odoo)
│   │   │   └── fee-estimate.ts      # ประเมินค่าบริการ
│   │   ├── prompts/
│   │   │   ├── thai-legal-advisor.ts    # System prompt ที่ปรึกษากฎหมาย
│   │   │   ├── case-summarizer.ts       # สรุปเคส
│   │   │   └── document-template.ts     # Template เอกสาร
│   │   └── resources/
│   │       ├── legal-categories.ts      # หมวดหมู่กฎหมาย
│   │       └── fee-schedule.ts          # ตารางค่าบริการ
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
│   ├── civil-code/
│   ├── criminal-code/
│   ├── labor-law/
│   ├── land-law/
│   └── consumer-protection/
│
└── CLAUDE.md
```

## Example Flow: ลูกค้าปรึกษากฎหมาย

```
1. ลูกค้าส่งข้อความ LINE: "ถูกเลิกจ้างไม่เป็นธรรม"
   │
2. bot-service (botforge) → Claude Code + legal-th plugin
   │
3. Claude Code เรียก MCP tools:
   ├─ legal_search("เลิกจ้างไม่เป็นธรรม") → RAG ค้น พ.ร.บ.คุ้มครองแรงงาน
   ├─ case_intake({type: "labor", desc: "..."}) → สร้าง Lead ใน Odoo
   └─ fee_estimate({type: "labor_unfair_dismissal"}) → ประเมินค่าบริการ
   │
4. Claude Code ตอบกลับ LINE:
   "ตามมาตรา 49 พ.ร.บ.คุ้มครองแรงงาน... คุณมีสิทธิ์ได้รับค่าชดเชย..."
   + Flex Message: สรุปสิทธิ์ + ปุ่ม "นัดพบทนาย"
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

### Phase 1 - Core (สัปดาห์ 1-2)
- [ ] Setup docker-compose ecosystem
- [ ] `legal-rag` + ingest กฎหมายแรงงาน (1 หมวด)
- [ ] `legal-mcp` tools: `legal_search`, `case_intake`
- [ ] `bot-service` LINE webhook → Claude → ตอบคำถามกฎหมาย

### Phase 2 - Odoo Integration (สัปดาห์ 3)
- [ ] `odoo-mcp` connect → Odoo CRM
- [ ] `case_status`, `appointment`, `fee_estimate` tools
- [ ] LINE LIFF mini-app: ดูสถานะเคส, นัดหมาย

### Phase 3 - Follow-up & Automation (สัปดาห์ 4)
- [ ] Follow-up scheduler (cron → LINE push + Odoo update)
- [ ] `document_draft` tool (ร่างหนังสือ/สัญญา)
- [ ] Skills: `/legal-consult`, `/case-create`, `/case-follow-up`

## Related Repositories

- https://github.com/monthop-gmail/botforge
- https://github.com/monthop-gmail/ragforge
- https://github.com/monthop-gmail/line-oa-mcp-claude
- https://github.com/monthop-gmail/odoo-mcp-claude
- https://github.com/monthop/odoo-codespace-docker
