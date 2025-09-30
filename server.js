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

// ✅ CORS para producción
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5000',
    'https://nabi-hotcakes.netlify.app'
  ],
  credentials: true
}));

app.use(helmet());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ✅ CONEXIÓN MONGODB CON FALLBACK
console.log('🔗 Intentando conectar a MongoDB...');

// ✅ VALORES DIRECTOS como fallback - ELIMINA LA DEPENDENCIA DEL .env
const mongoURI = process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb+srv://nabi:naruto214356@cluster0.tcwy4hm.mongodb.net/PedidosDB?retryWrites=true&w=majority&appName=Cluster0';

console.log('📦 URI MongoDB:', mongoURI ? '✅ Encontrada' : '❌ No encontrada');

if (!mongoURI) {
  console.error('❌ ERROR: No hay URI de MongoDB definida');
  process.exit(1);
}

// ✅ CONEXIÓN SIMPLIFICADA
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
// ... (TUS RUTAS ACTUALES SE MANTIENEN IGUAL) ...

app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 API Nabi Backend funcionando!',
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ✅ TUS RUTAS ACTUALES AQUÍ (login, pedidos, etc.)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Nabi Backend iniciado en puerto ${PORT}`);
});