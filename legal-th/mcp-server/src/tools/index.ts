import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const RAG_URL = process.env.RAG_URL || "http://legal-rag:8000";
const ODOO_MCP_URL = process.env.ODOO_MCP_URL || "http://odoo-mcp:8000";
const LINE_MCP_URL = process.env.LINE_MCP_URL || "http://line-oa-mcp:3001";

export function registerTools(server: McpServer) {
  // ─── Tool 1: ค้นหากฎหมาย (Legal Search) ───
  server.tool(
    "legal_search",
    "ค้นหาข้อกฎหมายไทย พ.ร.บ. มาตรา คำพิพากษา - Search Thai legal documents",
    {
      query: z.string().describe("คำค้นหา เช่น 'เลิกจ้างไม่เป็นธรรม' หรือ 'มาตรา 49 พ.ร.บ.คุ้มครองแรงงาน'"),
      category: z
        .enum(["all", "civil", "criminal", "labor", "land", "consumer"])
        .default("all")
        .describe("หมวดหมู่กฎหมาย"),
      top_k: z.number().default(5).describe("จำนวนผลลัพธ์"),
    },
    async ({ query, category, top_k }) => {
      try {
        const response = await fetch(`${RAG_URL}/api/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, category, top_k }),
        });
        const data = await response.json();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error searching legal documents: ${error}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ─── Tool 2: รับเคสใหม่ (Case Intake) ───
  server.tool(
    "case_intake",
    "รับเคสปรึกษากฎหมายใหม่ สร้าง Lead ใน Odoo CRM - Create new legal consultation case",
    {
      client_name: z.string().describe("ชื่อลูกค้า"),
      client_phone: z.string().optional().describe("เบอร์โทร"),
      client_line_id: z.string().optional().describe("LINE User ID"),
      case_type: z
        .enum(["civil", "criminal", "labor", "land", "consumer", "family", "corporate", "other"])
        .describe("ประเภทคดี"),
      description: z.string().describe("รายละเอียดเบื้องต้น"),
      urgency: z.enum(["low", "medium", "high", "urgent"]).default("medium").describe("ความเร่งด่วน"),
    },
    async ({ client_name, client_phone, client_line_id, case_type, description, urgency }) => {
      try {
        // Create lead in Odoo CRM via Odoo MCP
        const leadData = {
          model: "crm.lead",
          values: {
            name: `[${case_type.toUpperCase()}] ${client_name} - ${description.substring(0, 50)}`,
            contact_name: client_name,
            phone: client_phone || "",
            description: `ประเภท: ${case_type}\nความเร่งด่วน: ${urgency}\nLINE ID: ${client_line_id || "N/A"}\n\n${description}`,
            priority: urgency === "urgent" ? "3" : urgency === "high" ? "2" : urgency === "medium" ? "1" : "0",
            type: "opportunity",
          },
        };

        const response = await fetch(`${ODOO_MCP_URL}/api/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(leadData),
        });
        const data = await response.json();

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  status: "success",
                  message: `สร้างเคสใหม่เรียบร้อย: ${client_name}`,
                  case_id: data.id,
                  case_type,
                  urgency,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error creating case: ${error}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ─── Tool 3: สถานะเคส (Case Status) ───
  server.tool(
    "case_status",
    "ตรวจสอบสถานะเคส/คดี จาก Odoo CRM - Check case status",
    {
      case_id: z.number().optional().describe("Case ID ใน Odoo"),
      client_name: z.string().optional().describe("ค้นหาจากชื่อลูกค้า"),
      client_line_id: z.string().optional().describe("ค้นหาจาก LINE User ID"),
    },
    async ({ case_id, client_name, client_line_id }) => {
      try {
        let domain: unknown[] = [];
        if (case_id) domain = [["id", "=", case_id]];
        else if (client_name) domain = [["contact_name", "ilike", client_name]];
        else if (client_line_id) domain = [["description", "ilike", client_line_id]];

        const response = await fetch(`${ODOO_MCP_URL}/api/search_read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "crm.lead",
            domain,
            fields: ["name", "contact_name", "stage_id", "priority", "description", "create_date"],
            limit: 10,
          }),
        });
        const data = await response.json();
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // ─── Tool 4: นัดหมาย (Appointment) ───
  server.tool(
    "appointment_create",
    "สร้างนัดหมายพบทนาย/ที่ปรึกษากฎหมาย ใน Odoo Calendar - Create appointment",
    {
      client_name: z.string().describe("ชื่อลูกค้า"),
      date: z.string().describe("วันที่นัด (YYYY-MM-DD HH:mm)"),
      duration_hours: z.number().default(1).describe("ระยะเวลา (ชั่วโมง)"),
      case_type: z.string().describe("ประเภทเคส"),
      notes: z.string().optional().describe("หมายเหตุ"),
    },
    async ({ client_name, date, duration_hours, case_type, notes }) => {
      try {
        const response = await fetch(`${ODOO_MCP_URL}/api/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "calendar.event",
            values: {
              name: `นัดหมาย: ${client_name} - ${case_type}`,
              start: date,
              duration: duration_hours,
              description: notes || "",
            },
          }),
        });
        const data = await response.json();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ status: "success", appointment_id: data.id, date, client_name }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // ─── Tool 5: ร่างเอกสารกฎหมาย (Document Draft) ───
  server.tool(
    "document_draft",
    "ร่างเอกสารกฎหมาย สัญญา หนังสือ - Draft legal documents",
    {
      doc_type: z
        .enum([
          "demand_letter",
          "contract",
          "power_of_attorney",
          "complaint",
          "settlement",
          "legal_opinion",
          "notice",
        ])
        .describe("ประเภทเอกสาร"),
      parties: z
        .object({
          party_a: z.string().describe("ฝ่ายที่ 1"),
          party_b: z.string().describe("ฝ่ายที่ 2"),
        })
        .describe("คู่สัญญา"),
      details: z.string().describe("รายละเอียดที่ต้องระบุในเอกสาร"),
      language: z.enum(["th", "en", "th-en"]).default("th").describe("ภาษา"),
    },
    async ({ doc_type, parties, details, language }) => {
      const docTypeNames: Record<string, string> = {
        demand_letter: "หนังสือทวงถาม/บอกกล่าว",
        contract: "สัญญา",
        power_of_attorney: "หนังสือมอบอำนาจ",
        complaint: "คำฟ้อง",
        settlement: "สัญญาประนีประนอมยอมความ",
        legal_opinion: "ความเห็นทางกฎหมาย",
        notice: "หนังสือแจ้ง",
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                doc_type,
                doc_type_name: docTypeNames[doc_type],
                parties,
                details,
                language,
                instruction:
                  "กรุณาใช้ข้อมูลนี้ร่างเอกสารตาม template มาตรฐานกฎหมายไทย โดยใส่ข้อมูลคู่สัญญาและรายละเอียดให้ครบถ้วน",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ─── Tool 6: Follow-up (ติดตาม) ───
  server.tool(
    "follow_up",
    "ตั้งเวลา follow-up ลูกค้าผ่าน LINE และอัพเดท Odoo - Schedule follow-up",
    {
      client_line_id: z.string().describe("LINE User ID ของลูกค้า"),
      case_id: z.number().optional().describe("Case ID ใน Odoo"),
      message: z.string().describe("ข้อความ follow-up"),
      follow_up_date: z.string().describe("วันที่ follow-up (YYYY-MM-DD)"),
      channel: z.enum(["line", "both"]).default("both").describe("ช่องทาง follow-up"),
    },
    async ({ client_line_id, case_id, message, follow_up_date, channel }) => {
      const results: Record<string, unknown> = { scheduled: true, follow_up_date, channel };

      try {
        // Schedule LINE push message
        if (channel === "line" || channel === "both") {
          // In production, this would schedule via a job queue
          // For PoC, we store the follow-up info
          results.line = { status: "scheduled", user_id: client_line_id, message };
        }

        // Update Odoo case
        if ((channel === "both" && case_id) || case_id) {
          await fetch(`${ODOO_MCP_URL}/api/write`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "crm.lead",
              ids: [case_id],
              values: {
                description: `[Follow-up scheduled: ${follow_up_date}] ${message}`,
              },
            }),
          });
          results.odoo = { status: "updated", case_id };
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error}` }],
          isError: true,
        };
      }
    }
  );

  // ─── Tool 7: ประเมินค่าบริการ (Fee Estimate) ───
  server.tool(
    "fee_estimate",
    "ประเมินค่าบริการทางกฎหมายเบื้องต้น - Estimate legal service fees",
    {
      case_type: z
        .enum(["civil", "criminal", "labor", "land", "consumer", "family", "corporate"])
        .describe("ประเภทคดี"),
      complexity: z.enum(["simple", "moderate", "complex"]).default("moderate").describe("ความซับซ้อน"),
      service_type: z
        .enum(["consultation", "document_drafting", "negotiation", "litigation", "full_service"])
        .describe("ประเภทบริการ"),
    },
    async ({ case_type, complexity, service_type }) => {
      // Fee schedule (PoC - ปรับตามจริง)
      const baseFees: Record<string, Record<string, number>> = {
        consultation: { simple: 1500, moderate: 3000, complex: 5000 },
        document_drafting: { simple: 3000, moderate: 5000, complex: 10000 },
        negotiation: { simple: 5000, moderate: 10000, complex: 20000 },
        litigation: { simple: 20000, moderate: 50000, complex: 100000 },
        full_service: { simple: 30000, moderate: 80000, complex: 200000 },
      };

      const fee = baseFees[service_type]?.[complexity] || 0;
      const serviceNames: Record<string, string> = {
        consultation: "ปรึกษากฎหมาย",
        document_drafting: "ร่างเอกสาร",
        negotiation: "เจรจาต่อรอง",
        litigation: "ว่าความในศาล",
        full_service: "บริการครบวงจร",
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                case_type,
                service: serviceNames[service_type],
                complexity,
                estimated_fee: fee,
                fee_formatted: `${fee.toLocaleString()} บาท`,
                note: "ค่าบริการเบื้องต้น อาจปรับเปลี่ยนตามรายละเอียดของคดี กรุณานัดหมายเพื่อประเมินอีกครั้ง",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
