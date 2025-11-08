const User = require('./User');
const Stove = require('./Stove');
const StoveUsage = require('./StoveUsage');

// Define associations
Stove.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });
User.hasMany(Stove, { foreignKey: 'user_id', as: 'stoves' });

StoveUsage.belongsTo(Stove, { foreignKey: 'stove_id', targetKey: 'stove_id', as: 'stove' });
Stove.hasMany(StoveUsage, { foreignKey: 'stove_id', sourceKey: 'stove_id', as: 'usageRecords' });

module.exports = {
  User,
  Stove,
  StoveUsage
};

