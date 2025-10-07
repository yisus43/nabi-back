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
  // 🆕 NUEVOS CAMPOS DE PAGO
  paymentMethod: {
    type: String,
    enum: ['efectivo', 'transferencia'],
    default: 'efectivo'
  },
  paymentConfirmed: {
    type: Boolean,
    default: false
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

module.exports = mongoose.model('Order', OrderSchema);