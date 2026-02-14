const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ตรวจสอบว่ามีโฟลเดอร์ uploads หรือไม่ ถ้าไม่มีให้สร้างอัตโนมัติ
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // ใช้ Date.now() ร่วมกับ Random และลบช่องว่างออกจากชื่อเดิมเพื่อความปลอดภัย
    const sanitizedName = file.originalname.replace(/\s+/g, '-');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(sanitizedName)}`);
  }
});

const fileFilter = (req, file, cb) => {
  // กรองเฉพาะไฟล์ที่เป็นรูปภาพ (jpeg, png, webp, gif)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // ส่ง Error กลับไปพร้อมข้อความแจ้งเตือน
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP and GIF are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // จำกัดขนาดไว้ที่ 5MB
  }
});

module.exports = upload;