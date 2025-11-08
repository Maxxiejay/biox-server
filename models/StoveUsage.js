const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const StoveUsage = sequelize.define('StoveUsage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stove_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'stoves',
      key: 'stove_id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  cooking_events: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  total_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  fuel_used_kg: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'stove_usage',
  timestamps: false
});

module.exports = StoveUsage;

