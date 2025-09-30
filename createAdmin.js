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
    const existingAdmin = await User.findOne({ email: 'admin@nabi.com' });
    if (existingAdmin) {
      console.log('⚠️  El usuario admin ya existe');
      process.exit();
    }

    // Crear admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = new User({
      name: 'Administrador',
      email: 'admin@nabi.com',
      password: hashedPassword
    });
    
    await admin.save();
    console.log('✅ Admin creado exitosamente');
    console.log('📧 Email: admin@nabi.com');
    console.log('🔑 Password: admin123');
    
  } catch (error) {
    console.error('❌ Error creando admin:', error);
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
};

createAdmin();