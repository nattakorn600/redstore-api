// controllers/productController.js
const prisma = require('../lib/prisma');
const fs = require('fs');
const path = require('path');

// Helper function สำหรับลบไฟล์รูปภาพ
const deleteFile = (filePath) => {
  if (filePath) {
    const fullPath = path.join(process.cwd(), filePath); 
    if (fs.existsSync(fullPath)) {
      fs.unlink(fullPath, (err) => {
        if (err) console.error("Failed to delete local file:", err);
      });
    }
  }
};

// --- Get All Products ---
exports.getAllProducts = async (req, res) => {
  try {
    const products = await prisma.products.findMany({
      orderBy: { product_id: 'asc' }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- Get Product by ID ---
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.products.findUnique({
      where: { product_id: BigInt(id) }
    });

    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- Create Product ---
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    
    // รับ Path รูปภาพจาก Multer
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    const newProduct = await prisma.products.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        image_url
      }
    });

    res.status(201).json(newProduct);
  } catch (error) {
    if (req.file) deleteFile(`/uploads/${req.file.filename}`);
    res.status(500).json({ error: error.message });
  }
};

// --- Update Product ---
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock } = req.body;

    // 1. ตรวจสอบว่าสินค้ามีอยู่จริงไหม
    const oldProduct = await prisma.products.findUnique({
      where: { product_id: BigInt(id) }
    });

    if (!oldProduct) {
      // ถ้าไม่มีสินค้า และมีรูปอัพโหลดมาใหม่ ให้ลบทิ้งทันที
      if (req.file) deleteFile(`/uploads/${req.file.filename}`);
      return res.status(404).json({ message: "Product not found" });
    }

    // 2. จัดการรูปภาพ
    let image_url = oldProduct.image_url;
    if (req.file) {
      // ลบรูปเก่าถ้ามีรูปใหม่มา
      if (oldProduct.image_url) deleteFile(oldProduct.image_url);
      image_url = `/uploads/${req.file.filename}`;
    }

    // 3. Update ข้อมูล (ต้องมั่นใจว่า Parse ตัวเลขถูกต้อง)
    const updatedProduct = await prisma.products.update({
      where: { product_id: BigInt(id) },
      data: {
        name: name !== undefined ? name : oldProduct.name,
        description: description !== undefined ? description : oldProduct.description,
        price: price !== undefined ? parseFloat(price) : oldProduct.price,
        stock: stock !== undefined ? parseInt(stock) : oldProduct.stock,
        image_url: image_url,
        updated_at: new Date()
      }
    });

    // เนื่องจาก BigInt ส่งผ่าน JSON ไม่ได้โดยตรง ต้องแปลงเป็น String หรือ Number ก่อนส่งกลับ
    const result = {
      ...updatedProduct,
      product_id: updatedProduct.product_id.toString()
    };

    res.json(result);
  } catch (error) {
    // ถ้าเกิด Error ระหว่างทาง และมีไฟล์ใหม่อัพโหลดมา ให้ลบออก
    if (req.file) deleteFile(`/uploads/${req.file.filename}`);
    console.error("Update error:", error);
    res.status(500).json({ error: error.message });
  }
};

// --- Delete Product ---
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // หาข้อมูลก่อนลบเพื่อเอารูปไปลบใน Folder
    const product = await prisma.products.findUnique({
      where: { product_id: BigInt(id) }
    });

    if (product && product.image_url) {
      deleteFile(product.image_url);
    }

    await prisma.products.delete({
      where: { product_id: BigInt(id) }
    });

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};