// controllers/authController.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// --- Register ---
exports.register = async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;

    // Check if user exists
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.users.create({
      data: {
        first_name,
        last_name,
        email,
        password: hashedPassword,
        role: 'customer'
      }
    });

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- SignIn ---
exports.signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    // Generate Token
    const token = jwt.sign(
      { userId: user.user_id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const { password: _, ...userWithoutPassword } = user;
    
    // แปลง BigInt เป็น String เพื่อให้ JSON ส่งไปได้
    userWithoutPassword.user_id = userWithoutPassword.user_id.toString();

    res.json({
      message: "Login successful",
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- Get Current User (Me) ---
exports.me = async (req, res) => {
  try {
    // req.user มาจาก middleware (authenticateToken)
    const user = await prisma.users.findUnique({
      where: { user_id: BigInt(req.user.userId) }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ลบ password ออกก่อนส่งกลับ
    const { password: _, ...userWithoutPassword } = user;

    // หมายเหตุ: เนื่องจากเราตั้ง BigInt.prototype.toJSON ไว้ใน server.js แล้ว 
    // เราไม่จำเป็นต้อง .toString() ที่นี่ก็ได้ครับ แต่วงไว้เพื่อความชัวร์
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};