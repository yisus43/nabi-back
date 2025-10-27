require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const WebSocket = require('ws');
const Order = require('./models/order');
const User = require('./models/user'); 
const Ingredient = require('./models/Ingredient');
const Config = require('./models/config');
const Package = require('./models/package');
const auth = require('./middleware/auth');
const app = express();

// ✅ CREAR SERVIDOR HTTP PARA WEBSOCKETS
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ✅ ALMACENAR CONEXIONES ACTIVAS
const activeConnections = new Map();

// ✅ CONFIGURACIÓN WEBSOCKET
wss.on('connection', (ws, req) => {
  console.log('🔗 Nueva conexión WebSocket establecida');
  
  // Extraer token de la URL (ws://url?token=xxx)
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  
  if (!token) {
    console.log('❌ Conexión WebSocket rechazada: Sin token');
    ws.close(1008, 'Token requerido');
    return;
  }

  try {
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const userId = decoded.userId;
    
    // Guardar conexión
    activeConnections.set(userId, ws);
    console.log(`✅ Usuario ${userId} conectado via WebSocket`);
    
    // Enviar mensaje de bienvenida
    ws.send(JSON.stringify({
      tipo: 'conexion_establecida',
      mensaje: 'Conectado en tiempo real ✅'
    }));

    // Manejar mensajes del cliente
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log('📨 Mensaje WebSocket recibido:', data);
        
        // Aquí puedes manejar mensajes específicos del cliente si es necesario
        if (data.tipo === 'ping') {
          ws.send(JSON.stringify({ tipo: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch (error) {
        console.error('Error procesando mensaje WebSocket:', error);
      }
    });

    // Manejar cierre de conexión
    ws.on('close', () => {
      activeConnections.delete(userId);
      console.log(`🔌 Usuario ${userId} desconectado de WebSocket`);
    });

    // Manejar errores
    ws.on('error', (error) => {
      console.error('❌ Error WebSocket:', error);
      activeConnections.delete(userId);
    });

  } catch (error) {
    console.log('❌ Token WebSocket inválido:', error.message);
    ws.close(1008, 'Token inválido');
  }
});

// ✅ FUNCIÓN PARA ENVIAR MENSAJES A TODOS LOS CLIENTES
function broadcastToAll(message) {
  const messageStr = JSON.stringify(message);
  let sentCount = 0;
  
  activeConnections.forEach((ws, userId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
      sentCount++;
    }
  });
  
  console.log(`📢 Mensaje broadcast enviado a ${sentCount} clientes:`, message.tipo);
}

// ✅ PUERTO CORRECTO
const PORT = process.env.PORT || 3000;

// ✅ CONFIGURACIÓN CORS COMPLETA PARA FLUTTER WEB Y TODOS LOS ENTORNOS
app.use(cors({
  origin: function (origin, callback) {
    // ✅ Permitir requests sin origin (como mobile apps o Postman)
    if (!origin) return callback(null, true);
    
    // ✅ Lista de dominios permitidos
    const allowedOrigins = [
      'https://yisus43.github.io',
      'https://nabi-back.onrender.com',
      'http://localhost:3000',
      'http://localhost:8080',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:5000',
      // ✅ Todos los puertos de Flutter web development
      /http:\/\/localhost:\d+$/,
      /http:\/\/127\.0\.0\.1:\d+$/,
      /http:\/\/192\.168\.\d+\.\d+:\d+$/ // Para desarrollo en red local
    ];

    // ✅ Verificar si el origin está permitido
    if (allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    })) {
      return callback(null, true);
    } else {
      console.log('🚫 CORS bloqueado para origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Accept', 
    'Origin', 
    'X-Requested-With',
    'X-Requested-By',
    'Access-Control-Request-Headers',
    'Access-Control-Request-Method'
  ],
  exposedHeaders: ['Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// ✅ MANEJAR PREFLIGHT OPTIONS EXPLÍCITAMENTE
app.options('*', cors());
app.options('*', cors());
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json({ limit: '10mb' }));

// ✅ CONEXIÓN MONGODB
console.log('🔗 Intentando conectar a MongoDB...');

const mongoURI = process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb+srv://nabi:naruto214356@cluster0.tcwy4hm.mongodb.net/PedidosDB?retryWrites=true&w=majority&appName=Cluster0';

console.log('📦 URI MongoDB:', mongoURI ? '✅ Encontrada' : '❌ No encontrada');

if (!mongoURI) {
  console.error('❌ ERROR: No hay URI de MongoDB definida');
  process.exit(1);
}

mongoose.connect(mongoURI)
.then(() => {
  console.log('✅ MongoDB conectado exitosamente');
  console.log('📊 Base de datos:', mongoose.connection.name);
})
.catch(err => {
  console.error('❌ Error conectando a MongoDB:', err.message);
  process.exit(1);
});

// ================= RUTAS PÚBLICAS =================

app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 API Nabi Backend funcionando!',
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    websockets: activeConnections.size
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    websockets: activeConnections.size
  });
});

// 🆕 RUTA PÚBLICA PARA PAQUETES - DEBE IR PRIMERO
app.get('/api/packages/public', async (req, res) => {
  try {
    console.log('📦 Obteniendo paquetes públicos...');
    const packages = await Package.find({ available: true })
      .populate('ingredients')
      .sort({ order: 1, name: 1 });
    
    res.json({
      message: 'Paquetes públicos',
      count: packages.length,
      packages: packages
    });
  } catch (error) {
    console.error('❌ Error obteniendo paquetes públicos:', error);
    res.status(500).json({ 
      error: 'Error al obtener paquetes públicos: ' + error.message 
    });
  }
});

// 🆕 RUTA PÚBLICA PARA INGREDIENTES - DEBE IR PRIMERO
app.get('/api/ingredients/public', async (req, res) => {
  try {
    console.log('🥗 Obteniendo ingredientes públicos...');
    const ingredients = await Ingredient.find({ available: true })
      .sort({ category: 1, order: 1, name: 1 });
    
    res.json({
      message: 'Ingredientes públicos',
      count: ingredients.length,
      ingredients: ingredients
    });
  } catch (error) {
    console.error('❌ Error obteniendo ingredientes públicos:', error);
    res.status(500).json({ error: 'Error al obtener ingredientes públicos: ' + error.message });
  }
});

// 🆕 RUTA PÚBLICA PARA CONFIGURACIÓN
app.get('/api/config/public/:key', async (req, res) => {
  try {
    const { key } = req.params;
    console.log(`📡 Solicitando configuración pública para: ${key}`);
    
    const config = await Config.findOne({ key });
    
    if (!config) {
      console.log(`❌ Configuración ${key} no encontrada en BD`);
      // Devolver valores por defecto en lugar de error 404
      const defaultConfig = getDefaultConfig(key);
      return res.json(defaultConfig);
    }
    
    console.log(`✅ Configuración ${key} encontrada:`, config.value);
    res.json(config.value);
    
  } catch (error) {
    console.error(`❌ Error obteniendo configuración pública ${key}:`, error);
    // En caso de error, devolver valores por defecto
    const defaultConfig = getDefaultConfig(key);
    res.json(defaultConfig);
  }
});

// 🆕 FUNCIÓN PARA CONFIGURACIÓN POR DEFECTO
function getDefaultConfig(key) {
  console.log(`🔄 Usando configuración por defecto para: ${key}`);
  
  switch(key) {
    case 'horarios':
      return {
        lunes: { activo: true, inicio: '09:00', fin: '12:00' },
        martes: { activo: true, inicio: '12:00', fin: '13:00' },
        miércoles: { activo: true, inicio: '09:00', fin: '12:00' },
        jueves: { activo: true, inicio: '12:00', fin: '13:00' },
        viernes: { activo: true, inicio: '13:00', fin: '14:00' },
        sábado: { activo: false, inicio: '09:00', fin: '12:00' },
        domingo: { activo: false, inicio: '09:00', fin: '12:00' }
      };
    case 'precios':
      return {
        cantidad_15: 20,
        cantidad_20: 25,
        cantidad_25: 30,
        precio_extra: 5,
        paquetes: {
          Chocolate: 15,
          Fitness: 10,
          Fresita: 10,
          Lechera: 25,
          Gansito: 15
        }
      };
    case 'puntos_entrega':
      return [
        'Puerta de EMA 1',
        'Puerta de EMA 2',
        'Puerta de EMA 3',
        'Puerta de EMA 4',
        'Puerta de EMA 5',
        'Puerta de EMA 6',
        'Puerta de EMA 7',
        'Puerta de EMA 8',
        'Puerta de EMA 9',
        'Puerta de EMA 10',
        'Cafetería',
        'Oxxo',
        'Lobo'
      ];
    default:
      return {};
  }
}

// 🔥 RUTAS DE AUTENTICACIÓN
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 SOLICITUD DE LOGIN RECIBIDA:', req.body);
    
    const { username, password } = req.body;

    console.log('👤 Username recibido:', username);

    if (!username || !password) {
      return res.status(400).json({ error: 'Username y contraseña son requeridos' });
    }

    const user = await User.findOne({ username });
    console.log('👤 Usuario encontrado:', user ? 'Sí' : 'No');
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    console.log('🔑 Comparando contraseña...');
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    console.log('✅ Contraseña válida:', isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user._id,
        username: user.username,
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 🔥 RUTA PARA CREAR PEDIDOS - CON WEBSOCKET
app.post('/api/pedidos', async (req, res) => {
  try {
    console.log('📦 Recibiendo nuevo pedido...');

    const { 
      customer, 
      quantity, 
      package, 
      liquidos, 
      frutas, 
      toppings, 
      extras, 
      delivery, 
      punto, 
      phone, 
      total, 
      notas, 
      dia, 
      hora,
      paymentMethod,
      paymentConfirmed
    } = req.body;

    // Validaciones mejoradas
    if (!customer || !quantity || !package || !phone) {
      console.log('❌ Campos faltantes:', { customer, quantity, package, phone });
      return res.status(400).json({ 
        error: 'Campos requeridos: customer, quantity, package, phone',
        received: { customer, quantity, package, phone }
      });
    }

    const orderData = {
      customer: customer.toString().trim(),
      quantity: parseInt(quantity),
      package: package.toString(),
      liquidos: Array.isArray(liquidos) ? liquidos : [],
      frutas: Array.isArray(frutas) ? frutas : [],
      toppings: Array.isArray(toppings) ? toppings : [],
      extras: Array.isArray(extras) ? extras : [],
      notas: notas || '',
      delivery: delivery ? delivery.toString() : 'recoger',
      punto: punto ? punto.toString() : '',
      dia: dia || '',
      hora: hora || '',
      phone: phone.toString().trim(),
      total: parseFloat(total) || 0,
      paymentMethod: paymentMethod || 'efectivo',
      paymentConfirmed: paymentConfirmed || false,
      status: 'Pendiente',
      createdAt: new Date()
    };

    console.log('💾 Datos del pedido a guardar:', orderData);

    const newOrder = new Order(orderData);
    const savedOrder = await newOrder.save();
    
    console.log('✅ Pedido guardado ID:', savedOrder._id);

    // 🆕 NOTIFICAR VÍA WEBSOCKET
    broadcastToAll({
      tipo: 'nuevo_pedido',
      datos: savedOrder,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      message: 'Pedido creado exitosamente',
      orderId: savedOrder._id,
      order: savedOrder
    });

  } catch (error) {
    console.error('❌ Error creando pedido:', error);
    res.status(500).json({ 
      error: 'Error al crear el pedido: ' + error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 🆕 RUTA PARA ACTUALIZAR ESTADO DE PAGO - CON WEBSOCKET
app.patch('/api/pedidos/:id/payment', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentConfirmed } = req.body;

    console.log('💳 Actualizando estado de pago para pedido:', id);

    if (typeof paymentConfirmed !== 'boolean') {
      return res.status(400).json({ 
        error: 'paymentConfirmed debe ser un booleano (true/false)' 
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { paymentConfirmed },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    console.log('✅ Estado de pago actualizado:', updatedOrder.paymentConfirmed);

    // 🆕 NOTIFICAR VÍA WEBSOCKET
    broadcastToAll({
      tipo: 'pago_actualizado',
      datos: {
        orderId: id,
        paymentConfirmed: updatedOrder.paymentConfirmed,
        order: updatedOrder
      },
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Estado de pago actualizado',
      order: updatedOrder
    });

  } catch (error) {
    console.error('❌ Error actualizando estado de pago:', error);
    res.status(500).json({ error: 'Error al actualizar estado de pago: ' + error.message });
  }
});

// ================= RUTAS PROTEGIDAS (CON AUTENTICACIÓN PARA ADMIN) =================

app.get('/api/pedidos', auth, async (req, res) => {
  try {
    console.log('📦 SOLICITUD DE PEDIDOS RECIBIDA');
    
    const orders = await Order.find().sort({ createdAt: -1 });
    
    console.log(`✅ Pedidos encontrados: ${orders.length}`);
    
    res.json(orders);
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

app.patch('/api/pedidos/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Estado es requerido' });
    }

    const allowedStatus = ['Pendiente', 'Entregado', 'Cancelado'];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ 
        error: 'Estado inválido. Debe ser: Pendiente, Entregado o Cancelado' 
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // 🆕 NOTIFICAR VÍA WEBSOCKET
    broadcastToAll({
      tipo: 'estado_pedido_actualizado',
      datos: updatedOrder,
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Pedido actualizado',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error actualizando pedido:', error);
    res.status(500).json({ error: 'Error al actualizar pedido' });
  }
});

// 🆕 RUTAS PARA LIMPIAR PEDIDOS - CON WEBSOCKET
app.delete('/api/pedidos/status/:status', auth, async (req, res) => {
  try {
    const { status } = req.params;
    
    console.log(`🗑️ SOLICITUD PARA ELIMINAR PEDIDOS CON ESTADO: ${status}`);

    const allowedStatus = ['Entregado', 'Cancelado'];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ 
        error: 'Estado inválido. Solo se pueden eliminar pedidos Entregado o Cancelado' 
      });
    }

    const result = await Order.deleteMany({ status: status });
    
    console.log(`✅ Pedidos ${status} eliminados: ${result.deletedCount}`);
    
    // 🆕 NOTIFICAR VÍA WEBSOCKET
    broadcastToAll({
      tipo: 'pedidos_eliminados',
      datos: {
        status: status,
        deletedCount: result.deletedCount
      },
      timestamp: new Date().toISOString()
    });

    res.json({
      message: `Pedidos ${status} eliminados exitosamente`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('❌ Error eliminando pedidos por estado:', error);
    res.status(500).json({ error: 'Error al eliminar pedidos: ' + error.message });
  }
});

// 🆕 RUTAS PARA INGREDIENTES - CON WEBSOCKET
app.get('/api/ingredients', auth, async (req, res) => {
  try {
    console.log('🥗 Obteniendo ingredientes...');
    const ingredients = await Ingredient.find().sort({ category: 1, order: 1, name: 1 });
    
    console.log(`✅ Ingredientes encontrados: ${ingredients.length}`);
    res.json(ingredients);
  } catch (error) {
    console.error('❌ Error obteniendo ingredientes:', error);
    res.status(500).json({ error: 'Error al obtener ingredientes: ' + error.message });
  }
});

app.post('/api/ingredients', auth, async (req, res) => {
  try {
    console.log('➕ Creando nuevo ingrediente...');
    const { name, category, price, available, hasExtraCost, order } = req.body;
    
    if (!name || !category) {
      return res.status(400).json({ error: 'Nombre y categoría son requeridos' });
    }

    const newIngredient = new Ingredient({
      name: name.trim(),
      category,
      price: price || 0,
      available: available !== undefined ? available : true,
      hasExtraCost: hasExtraCost || false,
      order: order || 0
    });
    
    const savedIngredient = await newIngredient.save();
    console.log('✅ Ingrediente creado:', savedIngredient.name);
    
    // 🆕 NOTIFICAR VÍA WEBSOCKET
    broadcastToAll({
      tipo: 'ingrediente_creado',
      datos: savedIngredient,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(savedIngredient);
  } catch (error) {
    console.error('❌ Error creando ingrediente:', error);
    res.status(500).json({ error: 'Error al crear ingrediente: ' + error.message });
  }
});

app.put('/api/ingredients/:id', auth, async (req, res) => {
  try {
    console.log('✏️ Actualizando ingrediente...');
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedIngredient = await Ingredient.findByIdAndUpdate(
      id, 
      { ...updateData, updatedAt: new Date() }, 
      { new: true, runValidators: true }
    );
    
    if (!updatedIngredient) {
      return res.status(404).json({ error: 'Ingrediente no encontrado' });
    }
    
    console.log('✅ Ingrediente actualizado:', updatedIngredient.name);
    
    // 🆕 NOTIFICAR VÍA WEBSOCKET
    broadcastToAll({
      tipo: 'ingrediente_actualizado',
      datos: updatedIngredient,
      timestamp: new Date().toISOString()
    });

    res.json(updatedIngredient);
  } catch (error) {
    console.error('❌ Error actualizando ingrediente:', error);
    res.status(500).json({ error: 'Error al actualizar ingrediente: ' + error.message });
  }
});

app.delete('/api/ingredients/:id', auth, async (req, res) => {
  try {
    console.log('🗑️ Eliminando ingrediente...');
    const { id } = req.params;
    
    const deletedIngredient = await Ingredient.findByIdAndDelete(id);
    
    if (!deletedIngredient) {
      return res.status(404).json({ error: 'Ingrediente no encontrado' });
    }
    
    console.log('✅ Ingrediente eliminado:', deletedIngredient.name);
    
    // 🆕 NOTIFICAR VÍA WEBSOCKET
    broadcastToAll({
      tipo: 'ingrediente_eliminado',
      datos: { ingredientId: id },
      timestamp: new Date().toISOString()
    });

    res.json({ 
      message: 'Ingrediente eliminado exitosamente',
      deletedIngredient: deletedIngredient.name
    });
  } catch (error) {
    console.error('❌ Error eliminando ingrediente:', error);
    res.status(500).json({ error: 'Error al eliminar ingrediente: ' + error.message });
  }
});

// 🆕 RUTA PARA INICIALIZAR INGREDIENTES - CON WEBSOCKET
app.post('/api/ingredients/initialize', auth, async (req, res) => {
  try {
    console.log('🔄 Inicializando ingredientes por defecto...');
    
    const defaultIngredients = [
      // Líquidos
      { name: 'Lechera', category: 'liquidos', price: 0, hasExtraCost: false, order: 1 },
      { name: 'Nutella', category: 'liquidos', price: 5, hasExtraCost: true, order: 2 },
      { name: 'Maple', category: 'liquidos', price: 0, hasExtraCost: false, order: 3 },
      { name: 'Mermelada', category: 'liquidos', price: 0, hasExtraCost: false, order: 4 },
      { name: 'Chocolate Hersheys', category: 'liquidos', price: 5, hasExtraCost: true, order: 5 },
      
      // Frutas
      { name: 'Plátano', category: 'frutas', price: 0, hasExtraCost: false, order: 1 },
      { name: 'Manzana', category: 'frutas', price: 0, hasExtraCost: false, order: 2 },
      { name: 'Fresa', category: 'frutas', price: 5, hasExtraCost: true, order: 3 },
      { name: 'Durazno', category: 'frutas', price: 0, hasExtraCost: false, order: 4 },
      
      // Toppings
      { name: 'Granola', category: 'toppings', price: 0, hasExtraCost: false, order: 1 },
      { name: 'Nuez', category: 'toppings', price: 0, hasExtraCost: false, order: 2 },
      { name: 'Zucaritas', category: 'toppings', price: 0, hasExtraCost: false, order: 3 },
      { name: 'Chispas chocolate', category: 'toppings', price: 0, hasExtraCost: false, order: 4 },
      { name: 'Chispas colores', category: 'toppings', price: 0, hasExtraCost: false, order: 5 },
      
      // Extras
      { name: 'Bombones', category: 'extras', price: 5, hasExtraCost: true, order: 1 },
      { name: 'Oreo', category: 'extras', price: 5, hasExtraCost: true, order: 2 },
      { name: 'Mazapán', category: 'extras', price: 5, hasExtraCost: true, order: 3 },
      { name: 'Helado', category: 'extras', price: 5, hasExtraCost: true, order: 4 }
    ];

    await Ingredient.deleteMany({});
    const ingredients = await Ingredient.insertMany(defaultIngredients);
    
    console.log(`✅ ${ingredients.length} ingredientes inicializados`);
    
    // 🆕 NOTIFICAR VÍA WEBSOCKET
    broadcastToAll({
      tipo: 'ingredientes_inicializados',
      datos: { count: ingredients.length },
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Ingredientes inicializados exitosamente',
      count: ingredients.length,
      ingredients: ingredients
    });
  } catch (error) {
    console.error('❌ Error inicializando ingredientes:', error);
    res.status(500).json({ error: 'Error al inicializar ingredientes: ' + error.message });
  }
});

// 🆕 RUTAS DE CONFIGURACIÓN - CON WEBSOCKET
app.get('/api/config/:key', auth, async (req, res) => {
  try {
    const { key } = req.params;
    const config = await Config.findOne({ key });
    
    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

app.put('/api/config/:key', auth, async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    
    const config = await Config.findOneAndUpdate(
      { key },
      { 
        value,
        description: description || '',
        updatedAt: new Date()
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true 
      }
    );
    
    // 🆕 NOTIFICAR VÍA WEBSOCKET
    broadcastToAll({
      tipo: 'configuracion_actualizada',
      datos: config,
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Configuración actualizada',
      config
    });
  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

// 🆕 RUTA PARA INICIALIZAR CONFIGURACIÓN POR DEFECTO
app.post('/api/config/initialize', auth, async (req, res) => {
  try {
    console.log('🔄 Inicializando configuración por defecto...');
    
    const defaultConfigs = [
      {
        key: 'horarios',
        value: {
          lunes: { activo: true, inicio: '09:00', fin: '12:00' },
          martes: { activo: true, inicio: '12:00', fin: '13:00' },
          miércoles: { activo: true, inicio: '09:00', fin: '12:00' },
          jueves: { activo: true, inicio: '12:00', fin: '13:00' },
          viernes: { activo: true, inicio: '13:00', fin: '14:00' },
          sábado: { activo: false, inicio: '09:00', fin: '12:00' },
          domingo: { activo: false, inicio: '09:00', fin: '12:00' }
        },
        description: 'Horarios de atención y recogida'
      },
      {
        key: 'precios',
        value: {
          cantidad_15: 20,
          cantidad_20: 25,
          cantidad_25: 30,
          precio_extra: 5,
          paquetes: {
            Chocolate: 15,
            Fitness: 10,
            Fresita: 10,
            Lechera: 25,
            Gansito: 15
          }
        },
        description: 'Precios de productos y paquetes'
      },
      {
        key: 'puntos_entrega',
        value: [
          'Puerta de EMA 1',
          'Puerta de EMA 2',
          'Puerta de EMA 3',
          'Puerta de EMA 4',
          'Puerta de EMA 5',
          'Puerta de EMA 6',
          'Puerta de EMA 7',
          'Puerta de EMA 8',
          'Puerta de EMA 9',
          'Puerta de EMA 10',
          'Cafetería',
          'Oxxo',
          'Lobo'
        ],
        description: 'Puntos de entrega disponibles'
      }
    ];
    
    await Config.deleteMany({});
    const configs = await Config.insertMany(defaultConfigs);
    
    console.log(`✅ ${configs.length} configuraciones inicializadas`);
    
    res.json({
      message: 'Configuración inicializada exitosamente',
      count: configs.length,
      configs
    });
  } catch (error) {
    console.error('❌ Error inicializando configuración:', error);
    res.status(500).json({ error: 'Error al inicializar configuración' });
  }
});

// 🆕 RUTAS PARA PAQUETES - CON WEBSOCKET
app.get('/api/packages', auth, async (req, res) => {
  try {
    console.log('📦 Obteniendo paquetes...');
    const packages = await Package.find().populate('ingredients').sort({ order: 1, name: 1 });
    
    console.log(`✅ Paquetes encontrados: ${packages.length}`);
    res.json(packages);
  } catch (error) {
    console.error('❌ Error obteniendo paquetes:', error);
    res.status(500).json({ error: 'Error al obtener paquetes: ' + error.message });
  }
});

app.post('/api/packages', auth, async (req, res) => {
  try {
    console.log('➕ Creando nuevo paquete...');
    const { name, description, price, ingredients, available, order, icon } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ error: 'Nombre y precio son requeridos' });
    }

    const newPackage = new Package({
      name: name.trim(),
      description: description || '',
      price: price,
      ingredients: ingredients || [],
      available: available !== undefined ? available : true,
      order: order || 0,
      icon: icon || 'fas fa-box'
    });
    
    const savedPackage = await newPackage.save();
    console.log('✅ Paquete creado:', savedPackage.name);
    
    // 🆕 NOTIFICAR VÍA WEBSOCKET
    broadcastToAll({
      tipo: 'paquete_creado',
      datos: savedPackage,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(savedPackage);
  } catch (error) {
    console.error('❌ Error creando paquete:', error);
    res.status(500).json({ error: 'Error al crear paquete: ' + error.message });
  }
});

app.put('/api/packages/:id', auth, async (req, res) => {
  try {
    console.log('✏️ Actualizando paquete...');
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedPackage = await Package.findByIdAndUpdate(
      id, 
      { ...updateData, updatedAt: new Date() }, 
      { new: true, runValidators: true }
    ).populate('ingredients');
    
    if (!updatedPackage) {
      return res.status(404).json({ error: 'Paquete no encontrado' });
    }
    
    console.log('✅ Paquete actualizado:', updatedPackage.name);
    
    // 🆕 NOTIFICAR VÍA WEBSOCKET
    broadcastToAll({
      tipo: 'paquete_actualizado',
      datos: updatedPackage,
      timestamp: new Date().toISOString()
    });

    res.json(updatedPackage);
  } catch (error) {
    console.error('❌ Error actualizando paquete:', error);
    res.status(500).json({ error: 'Error al actualizar paquete: ' + error.message });
  }
});

app.delete('/api/packages/:id', auth, async (req, res) => {
  try {
    console.log('🗑️ Eliminando paquete...');
    const { id } = req.params;
    
    const deletedPackage = await Package.findByIdAndDelete(id);
    
    if (!deletedPackage) {
      return res.status(404).json({ error: 'Paquete no encontrado' });
    }
    
    console.log('✅ Paquete eliminado:', deletedPackage.name);
    
    // 🆕 NOTIFICAR VÍA WEBSOCKET
    broadcastToAll({
      tipo: 'paquete_eliminado',
      datos: { packageId: id },
      timestamp: new Date().toISOString()
    });

    res.json({ 
      message: 'Paquete eliminado exitosamente',
      deletedPackage: deletedPackage.name
    });
  } catch (error) {
    console.error('❌ Error eliminando paquete:', error);
    res.status(500).json({ error: 'Error al eliminar paquete: ' + error.message });
  }
});

// 🆕 RUTA PARA INICIALIZAR PAQUETES - CON WEBSOCKET
app.post('/api/packages/initialize', auth, async (req, res) => {
  try {
    console.log('🔄 Inicializando paquetes por defecto...');
    
    // Primero obtener todos los ingredientes para asignar IDs
    const allIngredients = await Ingredient.find();
    
    const defaultPackages = [
      {
        name: 'Chocolate',
        description: 'Nutella + plátano + chispas de chocolate + oreo + nuez',
        price: 15,
        ingredients: allIngredients.filter(ing => 
          ['Nutella', 'Plátano', 'Chispas chocolate', 'Oreo', 'Nuez'].includes(ing.name)
        ).map(ing => ing._id),
        available: true,
        order: 1,
        icon: 'fas fa-cookie-bite'
      },
      {
        name: 'Fitness',
        description: 'Granola + plátano + mermelada + nuez',
        price: 10,
        ingredients: allIngredients.filter(ing => 
          ['Granola', 'Plátano', 'Mermelada', 'Nuez'].includes(ing.name)
        ).map(ing => ing._id),
        available: true,
        order: 2,
        icon: 'fas fa-dumbbell'
      },
      {
        name: 'Fresita',
        description: 'Fresa + bombones + chispas de colores',
        price: 10,
        ingredients: allIngredients.filter(ing => 
          ['Fresa', 'Bombones', 'Chispas colores'].includes(ing.name)
        ).map(ing => ing._id),
        available: true,
        order: 3,
        icon: 'fas fa-strawberry'
      },
      {
        name: 'Lechera',
        description: 'Lechera + mazapán + plátano + nuez',
        price: 25,
        ingredients: allIngredients.filter(ing => 
          ['Lechera', 'Mazapán', 'Plátano', 'Nuez'].includes(ing.name)
        ).map(ing => ing._id),
        available: true,
        order: 4,
        icon: 'fas fa-cow'
      },
      {
        name: 'Gansito',
        description: 'Chocolate + fresa + bombones + chispas',
        price: 15,
        ingredients: allIngredients.filter(ing => 
          ['Chocolate Hersheys', 'Fresa', 'Bombones', 'Chispas chocolate'].includes(ing.name)
        ).map(ing => ing._id),
        available: true,
        order: 5,
        icon: 'fas fa-cake'
      }
    ];

    await Package.deleteMany({});
    const packages = await Package.insertMany(defaultPackages);
    
    console.log(`✅ ${packages.length} paquetes inicializados`);
    
    // 🆕 NOTIFICAR VÍA WEBSOCKET
    broadcastToAll({
      tipo: 'paquetes_inicializados',
      datos: { count: packages.length },
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Paquetes inicializados exitosamente',
      count: packages.length,
      packages: packages
    });
  } catch (error) {
    console.error('❌ Error inicializando paquetes:', error);
    res.status(500).json({ error: 'Error al inicializar paquetes: ' + error.message });
  }
});

// ✅ MANEJAR RUTAS NO ENCONTRADAS
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

// ✅ MANEJADOR DE ERRORES GLOBAL
app.use((error, req, res, next) => {
  console.error('🔥 Error global:', error);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal'
  });
});
// 🆕 ENDPOINT DE PRUEBA CORS
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: '✅ CORS funcionando correctamente',
    timestamp: new Date().toISOString(),
    allowedOrigins: [
      'https://yisus43.github.io',
      'http://localhost:*',
      'http://127.0.0.1:*'
    ]
  });
});

// ✅ INICIAR SERVIDOR CON WEBSOCKETS
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Nabi Backend con WebSockets iniciado en puerto ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔗 WebSockets: ws://localhost:${PORT}`);
  console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ CORS configurado para Flutter Web y todos los entornos`);
  console.log(`🌍 Dominios permitidos:`);
  console.log(`   - https://yisus43.github.io`);
  console.log(`   - https://nabi-back.onrender.com`);
  console.log(`   - http://localhost:* (todos los puertos)`);
  console.log(`   - http://127.0.0.1:* (todos los puertos)`);

});