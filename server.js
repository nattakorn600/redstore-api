// server.js 
const express = require('express');
const cors = require('cors');
const { apiReference } = require('@scalar/express-api-reference');
const swaggerSpec = require('./lib/swagger');

const authController = require('./controllers/authController');
const productController = require('./controllers/productController');
const cartController = require('./controllers/cartController');
const authenticateToken = require('./middleware/authMiddleware');

const upload = require('./middleware/uploadMiddleware');

const app = express();
BigInt.prototype.toJSON = function() { return this.toString(); };

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static('uploads'));

// --- Scalar UI ---
app.use('/scalar', apiReference({ spec: { content: swaggerSpec } }));

// --- Auth Routes ---
app.post('/api/auth/register', authController.register);
app.post('/api/auth/signin', authController.signIn);
app.get('/api/auth/me', authenticateToken, authController.me);

// --- Product Routes ---
app.get('/api/products', productController.getAllProducts);
app.get('/api/products/:id', productController.getProductById);
app.post('/api/products', authenticateToken, upload.single('image'), productController.createProduct);
app.put('/api/products/:id', authenticateToken, upload.single('image'), productController.updateProduct); 
app.delete('/api/products/:id', authenticateToken, productController.deleteProduct); 

// --- Cart API Endpoints ---
app.get('/api/cart', authenticateToken, cartController.getMyCart);
app.get('/api/cart/count', authenticateToken, cartController.getCartCount);
app.post('/api/cart/add', authenticateToken, cartController.addToCart);
app.post('/api/cart/checkout', authenticateToken, cartController.addToCart);
app.patch('/api/cart/items/:item_id/decrease', authenticateToken, cartController.decreaseQuantity);
app.delete('/api/cart/items/:item_id', authenticateToken, cartController.removeFromCart);

app.listen(5000, () => {
  console.log('✅ Server running on http://localhost:5000');
  console.log('📖 API Docs (Scalar): http://localhost:5000/scalar');
});