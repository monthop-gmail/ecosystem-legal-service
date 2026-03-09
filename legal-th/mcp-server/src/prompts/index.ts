import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer) {
  // ─── Prompt 1: ที่ปรึกษากฎหมายไทย ───
  server.prompt(
    "thai-legal-advisor",
    "System prompt สำหรับ AI ที่ปรึกษากฎหมายไทย",
    { case_type: z.string().optional().describe("ประเภทคดี (ถ้ามี)") },
    async ({ case_type }) => {
      const specialization = case_type
        ? `\nคุณเชี่ยวชาญเป็นพิเศษด้าน: ${case_type}`
        : "";

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `คุณเป็น AI ที่ปรึกษากฎหมายไทย ทำหน้าที่ให้คำปรึกษาเบื้องต้นด้านกฎหมายไทย
${specialization}

## แนวทางการให้คำปรึกษา:

1. **รับฟังปัญหา** - สอบถามข้อเท็จจริงให้ครบถ้วน
2. **วิเคราะห์ประเด็น** - ระบุข้อกฎหมายที่เกี่ยวข้อง อ้างอิงมาตรา/พ.ร.บ.
3. **ให้ความเห็น** - แนะนำแนวทางแก้ไข ทางเลือก ข้อดีข้อเสีย
4. **ประเมินค่าบริการ** - ให้ราคาเบื้องต้นตามประเภทบริการ
5. **แนะนำขั้นตอนถัดไป** - นัดพบทนาย, เตรียมเอกสาร

## ข้อควรระวัง:
- แจ้งว่าเป็นคำปรึกษาเบื้องต้น ไม่ใช่คำแนะนำทางกฎหมายอย่างเป็นทางการ
- แนะนำให้พบทนายความสำหรับเคสที่ซับซ้อน
- ใช้ภาษาที่เข้าใจง่าย หลีกเลี่ยงศัพท์กฎหมายที่ซับซ้อนเกินไป
- ตอบเป็นภาษาไทยเป็นหลัก

## Tools ที่ใช้ได้:
- legal_search: ค้นหาข้อกฎหมาย
- case_intake: สร้างเคสใหม่
- case_status: ตรวจสอบสถานะเคส
- appointment_create: นัดหมาย
- document_draft: ร่างเอกสาร
- follow_up: ตั้ง follow-up
- fee_estimate: ประเมินค่าบริการ`,
            },
          },
        ],
      };
    }
  );

  // ─── Prompt 2: สรุปเคส ───
  server.prompt(
    "case-summarizer",
    "สรุปเคสกฎหมายจากข้อมูลที่มี",
    {
      case_details: z.string().describe("รายละเอียดเคส"),
    },
    async ({ case_details }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `สรุปเคสกฎหมายต่อไปนี้ให้กระชับ โดยครอบคลุม:
1. ข้อเท็จจริง
2. ประเด็นกฎหมาย
3. ข้อกฎหมายที่เกี่ยวข้อง
4. ความเห็นเบื้องต้น
5. แนวทางดำเนินการ

เคส: ${case_details}`,
          },
        },
      ],
    })
  );

  // ─── Prompt 3: Template เอกสาร ───
  server.prompt(
    "document-template",
    "Template สำหรับร่างเอกสารกฎหมายไทย",
    {
      doc_type: z.string().describe("ประเภทเอกสาร"),
    },
    async ({ doc_type }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `ร่างเอกสารกฎหมายประเภท "${doc_type}" ตามรูปแบบมาตรฐานกฎหมายไทย

## รูปแบบที่ต้องมี:
- หัวเอกสาร (ชื่อ, เลขที่, วันที่)
- คำนำ/ที่มา
- เนื้อหาสาระสำคัญ
- ข้อกำหนดและเงื่อนไข
- ลงชื่อคู่สัญญา/ผู้มีอำนาจ
- พยาน (ถ้าจำเป็น)

กรุณาร่างเป็นภาษาไทย ใช้ถ้อยคำทางกฎหมายที่ถูกต้อง`,
          },
        },
      ],
    })
  );
}
