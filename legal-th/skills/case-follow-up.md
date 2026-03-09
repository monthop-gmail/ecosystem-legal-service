# /case-follow-up - ติดตามเคส

ติดตามสถานะเคสและ follow-up ลูกค้า

## ขั้นตอน:

1. รับ case_id หรือชื่อลูกค้า หรือ LINE ID
2. ใช้ tool `case_status` ตรวจสอบสถานะจาก Odoo
3. สรุปสถานะให้ลูกค้า
4. ถ้าต้องการ follow-up:
   - กำหนดวัน follow-up
   - เลือกช่องทาง (LINE / both)
   - ใช้ tool `follow_up` ตั้งเวลา
5. อัพเดทสถานะใน Odoo
