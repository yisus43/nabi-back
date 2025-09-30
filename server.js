require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Order = require('./models/order');
const User = require('./models/user'); 
const auth = require('./middleware/auth');
const app = express();

// ✅ PUERTO CORRECTO
const PORT = process.env.PORT || 3000;

// ✅ CONFIGURACIÓN CORS ROBUSTA
app.use(cors({
  origin: function (origin, callback) {
    // Permitir todos los orígenes durante desarrollo
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000', 
      'http://localhost:51988',
      'http://localhost:52959',
      'https://*.netlify.app',
      'https://*.render.com',
      'http://*.localhost'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(null, true); // Permitir todos temporalmente
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'Access-Control-Allow-Origin']
}));

// ✅ MANEJAR PREFLIGHT CORS MANUALMENTE
app.options('*', cors());

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json());

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

// ================= RUTAS =================
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 API Nabi Backend funcionando!',
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

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

// 🔥 RUTA PARA CREAR PEDIDOS
app.post('/api/pedidos', async (req, res) => {
  try {
    console.log('📦 Recibiendo nuevo pedido:', JSON.stringify(req.body, null, 2));

    const { customer, quantity, package, liquidos, frutas, toppings, extras, delivery, punto, vestimenta, phone, total } = req.body;

    if (!customer || !quantity || !package || !phone) {
      return res.status(400).json({ 
        error: 'Campos requeridos: customer, quantity, package, phone'
      });
    }

    const orderData = {
      customer: customer.toString().trim(),
      quantity: parseInt(quantity),
      package: package.toString(),
      liquidos: Array.isArray(liquidos) ? liquidos : [],
      frutas: Array.isArray(frutas) ? frutas : [],
      toppings: Array.isArray(toppings) ? toppings : [],
      extras: extras ? extras.toString() : '',
      delivery: delivery ? delivery.toString() : 'recoger',
      punto: punto ? punto.toString() : '',
      vestimenta: vestimenta ? vestimenta.toString() : '',
      phone: phone.toString().trim(),
      total: parseFloat(total) || 0,
      status: 'Pendiente',
      createdAt: new Date()
    };

    console.log('💾 Datos del pedido a guardar:', orderData);

    const newOrder = new Order(orderData);
    const savedOrder = await newOrder.save();
    
    console.log('✅ Pedido guardado ID:', savedOrder._id);

    res.status(201).json({
      message: 'Pedido creado exitosamente',
      orderId: savedOrder._id,
      order: savedOrder
    });

  } catch (error) {
    console.error('❌ Error creando pedido:', error);
    res.status(500).json({ 
      error: 'Error al crear el pedido: ' + error.message
    });
  }
});

// 🔥 RUTAS PROTEGIDAS (CON AUTENTICACIÓN PARA ADMIN)
app.get('/api/pedidos', auth, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
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

    res.json({
      message: 'Pedido actualizado',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error actualizando pedido:', error);
    res.status(500).json({ error: 'Error al actualizar pedido' });
  }
});

// ✅ RUTA PARA OBTENER PEDIDOS PÚBLICOS (SIN AUTENTICACIÓN)
app.get('/api/pedidos/public', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(50);
    res.json(orders);
  } catch (error) {
    console.error('Error obteniendo pedidos públicos:', error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
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

// ✅ INICIAR SERVIDOR
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Nabi Backend iniciado en puerto ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ CORS configurado de forma robusta`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? '✅ Configurado' : '❌ Usando fallback'}`);
});