const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  customer: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  package: {
    type: String,
    required: true,
    enum: ['Fitness', 'Chocolate', 'Lechera', 'Fresita', 'Gansito', 'personalizado'],
    default: 'Chocolate'
  },
  liquidos: [{
    type: String,
    trim: true
  }],
  frutas: [{
    type: String,
    trim: true
  }],
  toppings: [{
    type: String,
    trim: true
  }],
  extras: [{
    type: String,
    trim: true
  }],
  notas: {
    type: String,
    trim: true,
    default: ''
  },
  delivery: {
    type: String,
    enum: ['recoger', 'punto'],
    default: 'recoger'
  },
  punto: {
    type: String,
    trim: true,
    default: ''
  },
  dia: {
    type: String,
    trim: true,
    default: ''
  },
  hora: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['Pendiente', 'Entregado', 'Cancelado'],
    default: 'Pendiente'
  },
  // 🆕 CAMPOS DE PAGO MEJORADOS
  paymentMethod: {
    type: String,
    enum: ['efectivo', 'transferencia'],
    default: 'efectivo'
  },
  paymentConfirmed: {
    type: Boolean,
    default: false
  },
  // 🆕 NUEVO CAMPO: CÓDIGO DE REFERENCIA PARA TRANSFERENCIAS
  codigoReferencia: {
    type: String,
    trim: true,
    default: function() {
      // Generar código automáticamente si no se proporciona
      const fecha = new Date();
      const timestamp = fecha.getTime().toString().slice(-6);
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      return `NABI${timestamp}${random}`;
    }
  },
  isPriority: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índice para búsquedas más rápidas
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentMethod: 1 });

module.exports = mongoose.model('Order', OrderSchema);