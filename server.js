require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Order = require('./models/Order');
const User = require('./models/User');
const auth = require('./middleware/auth');

const app = express();

// ✅ CORS MEJORADO para producción
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5000',
      'https://nabi-hotcakes.netlify.app',
      'https://nabi-hotcakes.vercel.app'
    ];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 CORS bloqueado para origen:', origin);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
}));

app.use(helmet());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ✅ CONEXIÓN MONGODB OPTIMIZADA
console.log('🔗 Intentando conectar a MongoDB...');

// Railway usa MONGO_URL, MongoDB Atlas usa MONGO_URI
const mongoURI = process.env.MONGO_URL || process.env.MONGO_URI;

if (!mongoURI) {
  console.error('❌ ERROR: No hay URI de MongoDB definida');
  console.log('📋 Variables de entorno disponibles:', Object.keys(process.env));
  process.exit(1);
}

console.log('📦 URI MongoDB detectada');

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority'
})
.then(() => {
  console.log('✅ MongoDB conectado exitosamente');
  console.log('📊 Base de datos:', mongoose.connection.name);
})
.catch(err => {
  console.error('❌ Error conectando a MongoDB:', err.message);
  process.exit(1);
});

// ================= RUTAS =================

// Health check mejorado
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 API Nabi Backend funcionando!',
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Health check para Railway
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({ 
    status: 'OK', 
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Login para admin
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Usuario y contraseña requeridos' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username }, 
      process.env.JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.json({ 
      message: 'Login exitoso', 
      token,
      user: { username: user.username }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Registrar token FCM
app.post('/api/register-token', auth, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) {
      return res.status(400).json({ message: 'Token FCM requerido' });
    }

    await User.findByIdAndUpdate(req.user.id, { fcmToken });
    res.json({ message: 'Token FCM registrado exitosamente' });
  } catch (error) {
    console.error('Error registrando token FCM:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear nuevo pedido
app.post('/api/pedidos', async (req, res) => {
  try {
    console.log('📦 Recibiendo pedido:', JSON.stringify(req.body, null, 2));
    
    const {
      customer,
      quantity,
      package,
      liquidos = [],
      frutas = [],
      toppings = [],
      extras = '',
      delivery = 'recoger',
      punto = '',
      vestimenta = '',
      phone,
      total
    } = req.body;

    if (!customer || !quantity || !package || !phone || !total) {
      return res.status(400).json({ 
        message: 'Campos requeridos: customer, quantity, package, phone, total' 
      });
    }

    const pedidoData = {
      customer: customer.toString().trim(),
      quantity: parseInt(quantity) || 0,
      package: package.toString().trim(),
      liquidos: Array.isArray(liquidos) ? liquidos : [],
      frutas: Array.isArray(frutas) ? frutas : [],
      toppings: Array.isArray(toppings) ? toppings : [],
      extras: extras ? extras.toString().trim() : '',
      delivery: delivery ? delivery.toString().trim() : 'recoger',
      punto: punto ? punto.toString().trim() : '',
      vestimenta: vestimenta ? vestimenta.toString().trim() : '',
      phone: phone.toString().trim(),
      total: parseFloat(total) || 0,
      status: 'Pendiente'
    };

    console.log('📝 Creando pedido con datos:', pedidoData);

    const nuevoPedido = new Order(pedidoData);
    const pedidoGuardado = await nuevoPedido.save();

    console.log('✅ Pedido guardado exitosamente:', pedidoGuardado._id);

    res.status(201).json({
      message: '✅ Pedido recibido exitosamente',
      pedido: pedidoGuardado
    });

  } catch (error) {
    console.error('❌ Error creando pedido:', error.message);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Error de validación: ' + Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Error en el formato de datos: ' + error.message
      });
    }
    
    res.status(500).json({ 
      message: 'Error interno del servidor: ' + error.message 
    });
  }
});

// Obtener todos los pedidos (solo admin)
app.get('/api/pedidos', auth, async (req, res) => {
  try {
    const pedidos = await Order.find().sort({ createdAt: -1 }).limit(100);
    res.json(pedidos);
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar estado de pedido
app.patch('/api/pedidos/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Pendiente', 'Preparando', 'Listo', 'Entregado', 'Cancelado'].includes(status)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }

    const pedidoActualizado = await Order.findByIdAndUpdate(
      id, 
      { status }, 
      { new: true }
    );

    if (!pedidoActualizado) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    res.json({
      message: '✅ Estado actualizado',
      pedido: pedidoActualizado
    });

  } catch (error) {
    console.error('Error actualizando pedido:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('💥 Error global:', error);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// ✅ SERVIDOR LISTO
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Nabi Backend iniciado`);
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Conectado' : '❌ Desconectado'}`);
  console.log(`🕐 Iniciado: ${new Date().toISOString()}`);
});