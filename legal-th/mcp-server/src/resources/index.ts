import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerResources(server: McpServer) {
  // ─── Resource 1: หมวดหมู่กฎหมาย ───
  server.resource(
    "legal-categories",
    "legal://categories",
    async () => ({
      contents: [
        {
          uri: "legal://categories",
          mimeType: "application/json",
          text: JSON.stringify(
            {
              categories: [
                {
                  id: "civil",
                  name_th: "กฎหมายแพ่งและพาณิชย์",
                  name_en: "Civil and Commercial Law",
                  subcategories: ["สัญญา", "ละเมิด", "ทรัพย์สิน", "ครอบครัว", "มรดก"],
                },
                {
                  id: "criminal",
                  name_th: "กฎหมายอาญา",
                  name_en: "Criminal Law",
                  subcategories: ["ความผิดต่อชีวิต", "ความผิดต่อทรัพย์", "ฉ้อโกง", "ยาเสพติด"],
                },
                {
                  id: "labor",
                  name_th: "กฎหมายแรงงาน",
                  name_en: "Labor Law",
                  subcategories: ["เลิกจ้าง", "ค่าชดเชย", "ประกันสังคม", "สวัสดิการ"],
                },
                {
                  id: "land",
                  name_th: "กฎหมายที่ดิน",
                  name_en: "Land Law",
                  subcategories: ["ซื้อขาย", "เช่า", "จำนอง", "กรรมสิทธิ์"],
                },
                {
                  id: "consumer",
                  name_th: "คุ้มครองผู้บริโภค",
                  name_en: "Consumer Protection",
                  subcategories: ["สินค้า", "บริการ", "โฆษณา", "สัญญาไม่เป็นธรรม"],
                },
                {
                  id: "corporate",
                  name_th: "กฎหมายธุรกิจ",
                  name_en: "Corporate Law",
                  subcategories: ["จดทะเบียนบริษัท", "ผู้ถือหุ้น", "ภาษี", "ทรัพย์สินทางปัญญา"],
                },
                {
                  id: "family",
                  name_th: "กฎหมายครอบครัว",
                  name_en: "Family Law",
                  subcategories: ["หย่า", "สินสมรส", "อำนาจปกครองบุตร", "รับบุตรบุญธรรม"],
                },
              ],
            },
            null,
            2
          ),
        },
      ],
    })
  );

  // ─── Resource 2: ตารางค่าบริการ ───
  server.resource(
    "fee-schedule",
    "legal://fee-schedule",
    async () => ({
      contents: [
        {
          uri: "legal://fee-schedule",
          mimeType: "application/json",
          text: JSON.stringify(
            {
              currency: "THB",
              last_updated: "2026-01-01",
              note: "ราคาเบื้องต้น อาจปรับตามรายละเอียดคดี",
              services: [
                {
                  id: "consultation",
                  name: "ปรึกษากฎหมาย",
                  prices: { simple: 1500, moderate: 3000, complex: 5000 },
                  unit: "ครั้ง",
                },
                {
                  id: "document_drafting",
                  name: "ร่างเอกสาร/สัญญา",
                  prices: { simple: 3000, moderate: 5000, complex: 10000 },
                  unit: "ฉบับ",
                },
                {
                  id: "negotiation",
                  name: "เจรจาต่อรอง",
                  prices: { simple: 5000, moderate: 10000, complex: 20000 },
                  unit: "เรื่อง",
                },
                {
                  id: "litigation",
                  name: "ว่าความในศาล",
                  prices: { simple: 20000, moderate: 50000, complex: 100000 },
                  unit: "คดี",
                },
                {
                  id: "full_service",
                  name: "บริการครบวงจร",
                  prices: { simple: 30000, moderate: 80000, complex: 200000 },
                  unit: "คดี",
                },
              ],
            },
            null,
            2
          ),
        },
      ],
    })
  );
}
