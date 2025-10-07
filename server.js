require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Order = require('./models/order');
const User = require('./models/user'); 
const Ingredient = require('./models/Ingredient'); // 🆕 NUEVO
const auth = require('./middleware/auth');
const app = express();

// ✅ PUERTO CORRECTO
const PORT = process.env.PORT || 3000;

// ✅ CONFIGURACIÓN CORS ROBUSTA
app.use(cors({
  origin: function (origin, callback) {
    // Permitir todos los orígenes
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// ✅ MANEJAR PREFLIGHT CORS
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

// 🔥 RUTA PARA CREAR PEDIDOS - CORREGIDA CON PAYMENT METHOD
app.post('/api/pedidos', async (req, res) => {
  try {
    console.log('📦 Recibiendo nuevo pedido...');
    console.log('📊 Headers:', req.headers);
    console.log('📝 Body completo:', JSON.stringify(req.body, null, 2));

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
      paymentMethod, // 🆕 NUEVO CAMPO
      paymentConfirmed // 🆕 NUEVO CAMPO
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
      paymentMethod: paymentMethod || 'efectivo', // 🆕 VALOR POR DEFECTO
      paymentConfirmed: paymentConfirmed || false, // 🆕 VALOR POR DEFECTO
      status: 'Pendiente',
      createdAt: new Date()
    };

    console.log('💾 Datos del pedido a guardar:', orderData);

    const newOrder = new Order(orderData);
    const savedOrder = await newOrder.save();
    
    console.log('✅ Pedido guardado ID:', savedOrder._id);
    console.log('💳 Método de pago guardado:', savedOrder.paymentMethod);

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

// 🆕 RUTA PARA ACTUALIZAR ESTADO DE PAGO
app.patch('/api/pedidos/:id/payment', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentConfirmed } = req.body;

    console.log('💳 Actualizando estado de pago para pedido:', id);
    console.log('📝 Nuevo estado de pago:', paymentConfirmed);

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

    res.json({
      message: 'Estado de pago actualizado',
      order: updatedOrder
    });

  } catch (error) {
    console.error('❌ Error actualizando estado de pago:', error);
    res.status(500).json({ error: 'Error al actualizar estado de pago: ' + error.message });
  }
});

// 🔥 RUTAS PROTEGIDAS (CON AUTENTICACIÓN PARA ADMIN)
app.get('/api/pedidos', auth, async (req, res) => {
  try {
    console.log('📦 SOLICITUD DE PEDIDOS RECIBIDA');
    console.log('🔐 Usuario autenticado:', req.user);
    
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

    res.json({
      message: 'Pedido actualizado',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error actualizando pedido:', error);
    res.status(500).json({ error: 'Error al actualizar pedido' });
  }
});

// 🆕 RUTAS PARA LIMPIAR PEDIDOS (CON AUTENTICACIÓN)
app.delete('/api/pedidos/status/:status', auth, async (req, res) => {
  try {
    const { status } = req.params;
    
    console.log(`🗑️ SOLICITUD PARA ELIMINAR PEDIDOS CON ESTADO: ${status}`);
    console.log('🔐 Usuario autenticado:', req.user);

    const allowedStatus = ['Entregado', 'Cancelado'];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ 
        error: 'Estado inválido. Solo se pueden eliminar pedidos Entregado o Cancelado' 
      });
    }

    const result = await Order.deleteMany({ status: status });
    
    console.log(`✅ Pedidos ${status} eliminados: ${result.deletedCount}`);
    
    res.json({
      message: `Pedidos ${status} eliminados exitosamente`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('❌ Error eliminando pedidos por estado:', error);
    res.status(500).json({ error: 'Error al eliminar pedidos: ' + error.message });
  }
});

app.delete('/api/pedidos/completed', auth, async (req, res) => {
  try {
    console.log('🗑️ SOLICITUD PARA ELIMINAR PEDIDOS COMPLETADOS');
    console.log('🔐 Usuario autenticado:', req.user);

    const result = await Order.deleteMany({ 
      status: { $in: ['Entregado', 'Cancelado'] } 
    });
    
    console.log(`✅ Pedidos completados eliminados: ${result.deletedCount}`);
    
    res.json({
      message: 'Pedidos completados eliminados exitosamente',
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('❌ Error eliminando pedidos completados:', error);
    res.status(500).json({ error: 'Error al eliminar pedidos completados: ' + error.message });
  }
});

app.delete('/api/pedidos/all', auth, async (req, res) => {
  try {
    console.log('🗑️ SOLICITUD PARA ELIMINAR TODOS LOS PEDIDOS');
    console.log('🔐 Usuario autenticado:', req.user);

    const result = await Order.deleteMany({});
    
    console.log(`✅ Todos los pedidos eliminados: ${result.deletedCount}`);
    
    res.json({
      message: 'Todos los pedidos eliminados exitosamente',
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('❌ Error eliminando todos los pedidos:', error);
    res.status(500).json({ error: 'Error al eliminar todos los pedidos: ' + error.message });
  }
});

// 🆕 RUTAS PARA INGREDIENTES
app.get('/api/ingredients', async (req, res) => {
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

app.get('/api/ingredients/public', async (req, res) => {
  try {
    const ingredients = await Ingredient.find({ available: true })
      .sort({ category: 1, order: 1, name: 1 });
    
    res.json({
      message: 'Ingredientes públicos',
      count: ingredients.length,
      ingredients: ingredients
    });
  } catch (error) {
    console.error('Error obteniendo ingredientes públicos:', error);
    res.status(500).json({ error: 'Error al obtener ingredientes' });
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
    res.json({ 
      message: 'Ingrediente eliminado exitosamente',
      deletedIngredient: deletedIngredient.name
    });
  } catch (error) {
    console.error('❌ Error eliminando ingrediente:', error);
    res.status(500).json({ error: 'Error al eliminar ingrediente: ' + error.message });
  }
});

// 🆕 RUTA PARA INICIALIZAR INGREDIENTES POR DEFECTO
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

    // Eliminar ingredientes existentes
    await Ingredient.deleteMany({});
    
    // Insertar nuevos ingredientes
    const ingredients = await Ingredient.insertMany(defaultIngredients);
    
    console.log(`✅ ${ingredients.length} ingredientes inicializados`);
    
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

// ✅ RUTA PARA OBTENER PEDIDOS PÚBLICOS (SIN AUTENTICACIÓN)
app.get('/api/pedidos/public', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(50);
    res.json({
      message: 'Pedidos públicos',
      count: orders.length,
      orders: orders
    });
  } catch (error) {
    console.error('Error obteniendo pedidos públicos:', error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// ✅ RUTA DEBUG PARA TESTING
app.get('/api/debug', async (req, res) => {
  try {
    const orderCount = await Order.countDocuments();
    const ingredientCount = await Ingredient.countDocuments();
    res.json({
      message: 'Debug endpoint',
      ordersInDB: orderCount,
      ingredientsInDB: ingredientCount,
      timestamp: new Date().toISOString(),
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
});