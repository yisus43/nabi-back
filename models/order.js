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
      enum: ['Fitness', 'Chocolate', 'Lechera', 'Fresita', 'Gansito', 'personalizado'], // ✅ Agregar Gansito
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
    extras: [{  // 🆕 CAMBIAR de String a Array
      type: String,
      trim: true
    }],
    notas: {  // 🆕 AGREGAR este campo que falta
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
    dia: {  // 🆕 AGREGAR este campo que falta
      type: String,
      trim: true,
      default: ''
    },
    hora: {  // 🆕 AGREGAR este campo que falta
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
    createdAt: {
      type: Date,
      default: Date.now
    }
  });

  module.exports = mongoose.model('Order', OrderSchema);