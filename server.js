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

// ✅ CONFIGURACIÓN CORS MEJORADA
app.use(cors({
  origin: [
    'https://phenomenal-tiramisu-0fa451.netlify.app',  // ✅ TU URL CORRECTA
    'https://gentle-douhua-3750b2.netlify.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'https://nabi-hotcakes.netlify.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(helmet());
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
    const { email, password } = req.body;

    // Validar campos
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Buscar usuario
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token
    const token = jwt.sign(
      { userId: user._id, email: user.email }, 
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 🔥 RUTA PARA CREAR PEDIDOS (SIN AUTENTICACIÓN PARA CLIENTES)
app.post('/api/pedidos', async (req, res) => {
  try {
    console.log('📦 Recibiendo nuevo pedido:', req.body);

    const { customer, quantity, package, liquidos, frutas, extras, total, notes } = req.body;

    // Validaciones básicas
    if (!customer || !quantity || !package) {
      return res.status(400).json({ 
        error: 'Campos requeridos: customer, quantity, package' 
      });
    }

    // Crear nuevo pedido
    const newOrder = new Order({
      customer,
      quantity: parseInt(quantity),
      package,
      liquidos: liquidos || [],
      frutas: frutas || [],
      extras: extras || [],
      total: total || 0,
      notes: notes || '',
      status: 'pending',
      date: new Date()
    });

    const savedOrder = await newOrder.save();
    console.log('✅ Pedido guardado:', savedOrder._id);

    res.status(201).json({
      message: 'Pedido creado exitosamente',
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
    const orders = await Order.find().sort({ date: -1 });
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

// ✅ INICIAR SERVIDOR (CORREGIDO)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Nabi Backend iniciado en puerto ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`✅ CORS configurado para Netlify`);
});