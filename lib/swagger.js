// lib/swagger.js
const swaggerSpec = {
  openapi: '3.0.0',
  info: { 
    title: 'Online Store API', 
    version: '1.0.0',
    description: 'API documentation for the Online Store project, including Authentication, Product management, and Shopping Cart systems.'
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    // --- AUTHENTICATION ---
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  first_name: { type: 'string', example: 'John' },
                  last_name: { type: 'string', example: 'Doe' },
                  email: { type: 'string', example: 'john@example.com' },
                  password: { type: 'string', example: 'password123' }
                },
                required: ['first_name', 'last_name', 'email', 'password']
              }
            }
          }
        },
        responses: { 201: { description: 'Registration successful' } }
      }
    },
    '/api/auth/signin': {
      post: {
        tags: ['Auth'],
        summary: 'Login to get access token',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'john@example.com' },
                  password: { type: 'string', example: 'password123' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: { 200: { description: 'Login successful' } }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: { 
          200: { description: 'Profile retrieved successfully' },
          401: { description: 'Invalid or missing token' }
        }
      }
    },

    // --- PRODUCTS ---
    '/api/products': {
      get: {
        tags: ['Products'],
        summary: 'Get all products',
        responses: { 200: { description: 'Products retrieved successfully' } }
      },
      post: {
        tags: ['Products'],
        summary: 'Create a new product with image upload',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Premium Coffee Bean' },
                  description: { type: 'string', example: 'Dark roast, 250g' },
                  price: { type: 'number', format: 'float', example: 350.00 },
                  stock: { type: 'integer', example: 50 },
                  image: { type: 'string', format: 'binary', description: 'Product image file (JPG, PNG, WEBP)' }
                },
                required: ['name', 'price']
              }
            }
          }
        },
        responses: {
          201: { description: 'Product created successfully' },
          400: { description: 'Invalid file type or missing required fields' },
          500: { description: 'Internal server error' }
        }
      }
    },
    '/api/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get product by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 
          200: { description: 'Product found' },
          404: { description: 'Product not found' }
        }
      },
      put: {
        tags: ['Products'],
        summary: 'Update product (supports partial update and image change)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  price: { type: 'number', format: 'float' },
                  stock: { type: 'integer' },
                  image: { type: 'string', format: 'binary', description: 'New image file to replace the old one' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Product updated successfully' },
          404: { description: 'Product not found' },
          500: { description: 'Internal server error' }
        }
      },
      delete: {
        tags: ['Products'],
        summary: 'Delete product and its image file',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Product and associated file deleted successfully' },
          404: { description: 'Product not found' }
        }
      }
    },

    // --- SHOPPING CART ---
    '/api/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Get current user\'s active cart',
        security: [{ bearerAuth: [] }],
        responses: { 
          200: { description: 'Cart retrieved successfully' },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/api/cart/add': {
      post: {
        tags: ['Cart'],
        summary: 'Add product to cart (updates quantity and decreases stock)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  product_id: { type: 'string', example: "1" },
                  quantity: { type: 'integer', example: 1 }
                },
                required: ['product_id', 'quantity']
              }
            }
          }
        },
        responses: { 
          200: { description: 'Item added to cart successfully' },
          400: { description: 'Insufficient stock or invalid request' }
        }
      }
    },
    '/api/cart/items/{item_id}/decrease': {
      patch: {
        tags: ['Cart'],
        summary: 'Decrease item quantity by 1 (restores 1 unit to product stock)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'item_id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 
          200: { description: 'Quantity decreased (item removed if quantity reaches 0)' },
          404: { description: 'Cart item not found' }
        }
      }
    },
    '/api/cart/items/{item_id}': {
      delete: {
        tags: ['Cart'],
        summary: 'Remove item from cart (fully restores product stock)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'item_id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 
          200: { description: 'Item removed from cart successfully' },
          404: { description: 'Cart item not found' }
        }
      }
    }
  }
};

module.exports = swaggerSpec;