# legal-th Plugin

Thai Legal Service AI Plugin for Claude Code

## MCP Server

- Endpoint: `http://localhost:4100/mcp`
- 7 tools: legal_search, case_intake, case_status, appointment_create, document_draft, follow_up, fee_estimate
- 3 prompts: thai-legal-advisor, case-summarizer, document-template
- 2 resources: legal-categories, fee-schedule

## Skills (Slash Commands)

- `/legal-consult` - ปรึกษากฎหมายไทยเบื้องต้น
- `/case-create` - สร้างเคสใหม่ใน Odoo CRM
- `/case-follow-up` - ติดตามสถานะเคส + follow-up LINE/Odoo
- `/legal-doc` - ร่างเอกสารกฎหมาย (สัญญา, หนังสือทวงถาม, etc.)

## Dependencies

- legal-rag (RAG server) at port 8000
- odoo-mcp at port 8002
- line-oa-mcp at port 3001

## Knowledge Base

`knowledge/` directory contains Thai legal documents for RAG ingestion:
- civil-code/ - ประมวลกฎหมายแพ่งและพาณิชย์
- criminal-code/ - ประมวลกฎหมายอาญา
- labor-law/ - กฎหมายแรงงาน
- land-law/ - กฎหมายที่ดิน
- consumer-protection/ - คุ้มครองผู้บริโภค
