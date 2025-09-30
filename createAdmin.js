require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');

const createAdmin = async () => {
  try {
    console.log('🔗 Conectando a MongoDB...');
    
    const mongoURI = process.env.MONGO_URI || 'mongodb+srv://nabi:naruto214356@cluster0.tcwy4hm.mongodb.net/PedidosDB?retryWrites=true&w=majority&appName=Cluster0';
    
    await mongoose.connect(mongoURI);
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existe el admin
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  El usuario admin ya existe');
      console.log('📧 Username: admin');
      console.log('🔑 Password: admin123');
      process.exit();
    }

    // Crear admin con la estructura CORRECTA
    const passwordHash = await bcrypt.hash('admin123', 10);
    const admin = new User({
      username: 'admin',  // ✅ Usar 'username' no 'email'
      passwordHash: passwordHash,  // ✅ Usar 'passwordHash' no 'password'
    });
    
    await admin.save();
    console.log('✅ Admin creado exitosamente');
    console.log('👤 Username: admin');
    console.log('🔑 Password: admin123');
    
  } catch (error) {
    console.error('❌ Error creando admin:', error);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
};

createAdmin();