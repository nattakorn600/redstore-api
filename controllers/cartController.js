// controllers/cartController.js
const prisma = require('../lib/prisma');

exports.getCartCount = async (req, res) => {
  try {
    const userId = BigInt(req.user.userId);
    
    // ค้นหาตะกร้าที่ active และรวมจำนวน (sum) ของ quantity ทั้งหมด
    const cartData = await prisma.carts.findFirst({
      where: { user_id: userId, status: 'active' },
      include: {
        _count: {
          select: { cart_items: true } // นับจำนวนรายการ (rows)
        },
        cart_items: {
          select: { quantity: true } // หรือนับรวมจำนวนชิ้นทั้งหมด
        }
      }
    });

    const totalQuantity = cartData?.cart_items.reduce((sum, item) => sum + item.quantity, 0) || 0;

    res.json({ count: totalQuantity });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- 1. Add to Cart (เพิ่มสินค้า/ตัดสต็อก/จัดการสินค้าซ้ำ) ---
exports.addToCart = async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    const userId = BigInt(req.user.userId); // ดึงจาก middleware auth

    // ใช้ Transaction เพื่อให้มั่นใจว่าถ้าตัดสต็อกพลาด ตะกร้าจะไม่เพิ่ม
    const result = await prisma.$transaction(async (tx) => {
      // 1. เช็คว่ามี Cart ที่ยัง active อยู่ไหม ถ้าไม่มีให้สร้างใหม่
      let cart = await tx.carts.findFirst({
        where: { user_id: userId, status: 'active' }
      });

      if (!cart) {
        cart = await tx.carts.create({ data: { user_id: userId } });
      }

      // 2. เช็คสต็อกสินค้า
      const product = await tx.products.findUnique({
        where: { product_id: BigInt(product_id) }
      });

      if (!product || product.stock < quantity) {
        throw new Error('Inadequate stock or product not found');
      }

      // 3. ตัดสต็อกสินค้า
      await tx.products.update({
        where: { product_id: BigInt(product_id) },
        data: { stock: { decrement: quantity } }
      });

      // 4. เพิ่มลง cart_items (ถ้าซ้ำให้ increment quantity)
      const cartItem = await tx.cart_items.upsert({
        where: {
          cart_id_product_id: { cart_id: cart.cart_id, product_id: BigInt(product_id) }
        },
        update: { quantity: { increment: quantity } },
        create: {
          cart_id: cart.cart_id,
          product_id: BigInt(product_id),
          quantity: quantity
        }
      });

      return cartItem;
    });

    res.status(200).json({ message: "Added to cart successfully", result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// --- 2. Decrease Quantity (ลดจำนวนสินค้าใน Cart / คืนสต็อก) ---
exports.decreaseQuantity = async (req, res) => {
  try {
    const { item_id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.cart_items.findUnique({
        where: { item_id: BigInt(item_id) }
      });

      if (!item || item.quantity <= 0) throw new Error('Item not found or invalid quantity');

      // 1. เพิ่มสต็อกกลับคืน
      await tx.products.update({
        where: { product_id: item.product_id },
        data: { stock: { increment: 1 } }
      });

      // 2. ลดจำนวนใน Cart ถ้าเหลือ 1 แล้วกดลดอีก ให้ลบแถวนั้นทิ้งเลย
      if (item.quantity === 1) {
        await tx.cart_items.delete({ where: { item_id: BigInt(item_id) } });
        return { message: "Item removed from cart" };
      } else {
        const updated = await tx.cart_items.update({
          where: { item_id: BigInt(item_id) },
          data: { quantity: { decrement: 1 } }
        });
        return updated;
      }
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// --- 3. Remove Item (ลบสินค้าออกจากตะกร้า / คืนสต็อกทั้งหมด) ---
exports.removeFromCart = async (req, res) => {
  try {
    const { item_id } = req.params;

    await prisma.$transaction(async (tx) => {
      const item = await tx.cart_items.findUnique({ where: { item_id: BigInt(item_id) } });
      if (!item) throw new Error('Item not found');

      // คืนสต็อกตามจำนวนที่เคยมีในตะกร้า
      await tx.products.update({
        where: { product_id: item.product_id },
        data: { stock: { increment: item.quantity } }
      });

      await tx.cart_items.delete({ where: { item_id: BigInt(item_id) } });
    });

    res.json({ message: "Item removed and stock restored" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// --- 4. Get My Cart (ดึงข้อมูลตะกร้าปัจจุบัน) ---
exports.getMyCart = async (req, res) => {
  try {
    const cart = await prisma.carts.findFirst({
      where: { user_id: BigInt(req.user.userId), status: 'active' },
      include: {
        cart_items: {
          include: { products: true } // join กับตารางสินค้าเพื่อเอาชื่อและรูป
        }
      }
    });
    res.json(cart || { cart_items: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};