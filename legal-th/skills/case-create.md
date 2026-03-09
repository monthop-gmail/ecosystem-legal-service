# /case-create - สร้างเคสใหม่

สร้างเคสปรึกษากฎหมายใหม่ใน Odoo CRM

## ขั้นตอน:

1. สอบถามข้อมูลลูกค้า: ชื่อ, เบอร์โทร, LINE ID
2. สอบถามประเภทคดี: civil, criminal, labor, land, consumer, family, corporate
3. สอบถามรายละเอียดเบื้องต้น
4. ประเมินความเร่งด่วน: low, medium, high, urgent
5. ใช้ tool `case_intake` สร้างเคสใน Odoo
6. แจ้งหมายเลขเคสให้ลูกค้า
7. ถามว่าต้องการนัดหมาย → ใช้ `appointment_create`
