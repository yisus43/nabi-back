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

// ✅ AGREGAR ESTA LÍNEA (FALTABA):
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: [
    'https://gentle-douhua-3750b2.netlify.app',  // ✅ TU URL DE NETLIFY
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'https://nabi-hotcakes.netlify.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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

// 🔥 AGREGA TUS RUTAS AQUÍ (login, pedidos, etc.)
app.post('/api/auth/login', async (req, res) => {
  // ... tu código de login ...
});

app.post('/api/pedidos', async (req, res) => {
  // ... tu código de pedidos ...
});

app.get('/api/pedidos', auth, async (req, res) => {
  // ... tu código para obtener pedidos ...
});

app.patch('/api/pedidos/:id', auth, async (req, res) => {
  // ... tu código para actualizar pedidos ...
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Nabi Backend iniciado en puerto ${PORT}`);
});