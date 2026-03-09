# Contributing to Ecosystem Legal Service

ขอบคุณที่สนใจร่วมพัฒนา! 🙏

## How to Contribute

### 1. Fork & Clone

```bash
git clone https://github.com/<your-username>/ecosystem-legal-service.git
cd ecosystem-legal-service
git checkout -b feature/your-feature
```

### 2. Areas to Contribute

#### เพิ่มเอกสารกฎหมาย
เพิ่มไฟล์ `.txt` ใน `legal-th/knowledge/` ตามหมวดหมู่:
```
legal-th/knowledge/
├── civil-code/           # ประมวลกฎหมายแพ่งและพาณิชย์
├── criminal-code/        # ประมวลกฎหมายอาญา
├── labor-law/            # กฎหมายแรงงาน
├── land-law/             # กฎหมายที่ดิน
└── consumer-protection/  # คุ้มครองผู้บริโภค
```

#### เพิ่ม MCP Tools
สร้างไฟล์ใน `legal-th/mcp-server/src/tools/` แล้ว register ใน `index.ts`

#### เพิ่ม Skills
สร้างไฟล์ `.md` ใน `legal-th/skills/` ตาม format:
```markdown
# /skill-name - คำอธิบาย

## ขั้นตอน:
1. ...
2. ...
```

### 3. Commit & PR

```bash
git add .
git commit -m "feat: add new tool/knowledge/skill"
git push origin feature/your-feature
```

แล้วสร้าง Pull Request ใน GitHub

## Guidelines

- เขียน commit message เป็นภาษาอังกฤษ
- เอกสารกฎหมายเป็นภาษาไทย
- Code comments เป็นภาษาอังกฤษ, description เป็นสองภาษา
- อ้างอิงแหล่งที่มาของเอกสารกฎหมายเสมอ
- ทดสอบก่อน submit PR

## Code of Conduct

- สุภาพ เคารพซึ่งกันและกัน
- เปิดรับความคิดเห็นที่แตกต่าง
- เน้นคุณภาพของข้อมูลกฎหมาย (ความถูกต้องสำคัญมาก)

## Questions?

เปิด Issue ใน GitHub หรือ Discussion ได้เลยครับ
