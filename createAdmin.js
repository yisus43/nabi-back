require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function createAdmin() {
  try {
    console.log('🔗 Conectando a MongoDB...');
    console.log('MONGO_URI:', process.env.MONGO_URI ? '✅ Definida' : '❌ No definida');
    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI no está definida en el archivo .env');
    }

    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existe un admin
    const existingAdmin = await User.findOne({ username: process.env.ADMIN_USER });
    if (existingAdmin) {
      console.log('⚠️  El usuario admin ya existe');
      process.exit(0);
    }

    // Crear nuevo admin
    const password = process.env.ADMIN_PASS || 'admin123';
    const passwordHash = await bcrypt.hash(password, 12);

    const adminUser = new User({
      username: process.env.ADMIN_USER,
      passwordHash: passwordHash
    });

    await adminUser.save();
    console.log('✅ Usuario admin creado exitosamente');
    console.log(`👤 Usuario: ${process.env.ADMIN_USER}`);
    console.log(`🔑 Contraseña: ${password}`);
    console.log('⚠️  ¡Cambia esta contraseña en producción!');

  } catch (error) {
    console.error('❌ Error creando admin:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(0);
  }
}

createAdmin();