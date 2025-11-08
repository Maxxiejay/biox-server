const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');
const StoveUsage = require('./StoveUsage');

const Stove = sequelize.define('Stove', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stove_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  model: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  pairing_code: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  api_key: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('unpaired', 'paired'),
    defaultValue: 'unpaired',
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'stoves',
  timestamps: false
});

module.exports = Stove;

