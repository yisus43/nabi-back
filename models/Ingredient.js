const mongoose = require('mongoose');

const IngredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true // 🆕 EVITAR DUPLICADOS
  },
  category: {
    type: String,
    enum: ['liquidos', 'frutas', 'toppings', 'extras'],
    required: true
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  available: {
    type: Boolean,
    default: true
  },
  hasExtraCost: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Actualizar updatedAt antes de guardar
IngredientSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Índices para mejor rendimiento
IngredientSchema.index({ category: 1, order: 1 });
IngredientSchema.index({ available: 1 });

module.exports = mongoose.model('Ingredient', IngredientSchema);