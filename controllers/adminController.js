const Stove = require('../models/Stove');
const User = require('../models/User');
const StoveUsage = require('../models/StoveUsage');
const { generatePairingCode } = require('./stoveController');
const { sequelize } = require('../config/db');
const { Op, fn, col } = require('sequelize');

// Admin registers a new stove
const registerStove = async (req, res) => {
  try {
    const { stoveId, stoveModel } = req.body;

    const stove_id = stoveId
    const model = stoveModel

    // Validate input
    if (!stove_id || !model) {
      return res.status(400).json({ error: 'Stove ID and model are required' });
    }

    // Check if stove_id already exists
    const existingStove = await Stove.findOne({ where: { stove_id } });
    if (existingStove) {
      return res.status(400).json({ error: 'Stove ID already exists' });
    }

    // Generate pairing code
    const pairing_code = generatePairingCode();

    // Create stove
    const stove = await Stove.create({
      stove_id,
      model,
      pairing_code,
      status: 'unpaired'
    });

    res.status(201).json({
      message: 'Stove registered successfully',
      stove: {
        id: stove.id,
        stove_id: stove.stove_id,
        model: stove.model,
        pairing_code: stove.pairing_code,
        status: stove.status
      }
    });
  } catch (error) {
    console.error('Register stove error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin views all usage
const getAllUsage = async (req, res) => {
  try {
    // Get all usage records with user and stove info
    const usageRecords = await StoveUsage.findAll({
      include: [{
        model: Stove,
        as: 'stove',
        include: [{
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email']
        }]
      }],
      order: [['date', 'DESC'], ['created_at', 'DESC']]
    });

    // Group by user
    const groupedByUser = {};
    usageRecords.forEach(record => {
      const userId = record.stove?.owner?.id || 'unpaired';
      const userName = record.stove?.owner?.name || 'Unpaired';
      const userEmail = record.stove?.owner?.email || null;

      if (!groupedByUser[userId]) {
        groupedByUser[userId] = {
          user: {
            id: userId !== 'unpaired' ? userId : null,
            name: userName,
            email: userEmail
          },
          stoves: {}
        };
      }

      const stoveId = record.stove_id;
      if (!groupedByUser[userId].stoves[stoveId]) {
        groupedByUser[userId].stoves[stoveId] = {
          stove_id: stoveId,
          model: record.stove?.model || 'Unknown',
          usage: []
        };
      }

      groupedByUser[userId].stoves[stoveId].usage.push({
        id: record.id,
        date: record.date,
        cooking_events: record.cooking_events,
        total_minutes: record.total_minutes,
        fuel_used_kg: record.fuel_used_kg,
        created_at: record.created_at
      });
    });

    res.json({
      total_records: usageRecords.length,
      grouped_by_user: Object.values(groupedByUser)
    });
  } catch (error) {
    console.error('Get all usage error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin views all users with their total fuel consumption
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        'id',
        'name',
        'email',
        'role',
        'created_at',
        [sequelize.fn('SUM', sequelize.col('stoves->usageRecords.fuel_used_kg')), 'total_fuel_used'],
        [sequelize.fn('COUNT', sequelize.col('stoves->usageRecords.id')), 'total_logs'],
        [sequelize.fn('SUM', sequelize.col('stoves->usageRecords.cooking_events')), 'total_cooking_events'],
        [sequelize.fn('SUM', sequelize.col('stoves->usageRecords.total_minutes')), 'total_minutes_used']
      ],
      include: [{
        model: Stove,
        as: 'stoves',
        attributes: ['stove_id', 'model', 'status'],
        include: [{
          model: StoveUsage,
          as: 'usageRecords',
          attributes: []
        }]
      }],
      group: ['User.id', 'stoves.id', 'stoves.stove_id', 'stoves.model', 'stoves.status'],
      order: [['created_at', 'DESC']]
    });

    // Format the response
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
      stoves: user.stoves,
      usageSummary: {
        activeStoves: user.stoves.filter(s => s.status === 'paired').length,
        totalFuelUsed: Math.round(parseFloat(user.getDataValue('total_fuel_used') || 0) * 100) / 100,
        totalLogs: parseInt(user.getDataValue('total_logs') || 0, 10),
        totalCookingEvents: parseInt(user.getDataValue('total_cooking_events') || 0, 10),
        totalMinutesUsed: parseInt(user.getDataValue('total_minutes_used') || 0, 10)
      }
    }));

    res.json({ users: formattedUsers });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin views all stoves with their total fuel consumption
const getAllStoves = async (req, res) => {
  try {
    const stoves = await Stove.findAll({
      attributes: [
        'id',
        'stove_id',
        'model',
        'status',
        'created_at',
        [sequelize.fn('SUM', sequelize.col('usageRecords.fuel_used_kg')), 'total_fuel_used'],
        [sequelize.fn('COUNT', sequelize.col('usageRecords.id')), 'total_logs'],
        [sequelize.fn('SUM', sequelize.col('usageRecords.cooking_events')), 'total_cooking_events'],
        [sequelize.fn('SUM', sequelize.col('usageRecords.total_minutes')), 'total_minutes_used']
      ],
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email']
        },
        {
          model: StoveUsage,
          as: 'usageRecords',
          attributes: []  // Empty because we're using aggregations in main query
        }
      ],
      group: ['Stove.id', 'owner.id', 'owner.name', 'owner.email'], // Group by stove and include owner fields
      order: [['created_at', 'DESC']]
    });

    // Format the response to handle NULL values and ensure proper number formatting
    const formattedStoves = stoves.map(stove => ({
      id: stove.id,
      stoveId: stove.stove_id,
      model: stove.model,
      status: stove.status,
      createdAt: stove.created_at,
      owner: stove.owner,
      usageSummary: {
        totalFuelUsed: Math.round(parseFloat(stove.getDataValue('total_fuel_used') || 0) * 100) / 100,
        totalLogs: parseInt(stove.getDataValue('total_logs') || 0, 10),
        totalCookingEvents: parseInt(stove.getDataValue('total_cooking_events') || 0, 10),
        totalMinutesUsed: parseInt(stove.getDataValue('total_minutes_used') || 0, 10)
      }
    }));

    res.json({ stoves: formattedStoves });
  } catch (error) {
    console.error('Get all stoves error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin stats summary
const getStats = async (req, res) => {
  try {
    // Total users
    const totalUsers = await User.count();

    // Active stoves (paired)
    const activeStoves = await Stove.count({ where: { status: 'paired' } });

    // Today's date in YYYY-MM-DD (DATEONLY format)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Total fuel used today - aggregate all logs for today
    const todayFuelLogs = await StoveUsage.findAll({
      where: { date: todayStr },
      attributes: [
        [fn('SUM', col('fuel_used_kg')), 'total_fuel'],
        [fn('SUM', col('cooking_events')), 'total_events']
      ]
    });
    
    const totalFuelToday = parseFloat(todayFuelLogs[0]?.getDataValue('total_fuel') || 0);
    const totalCookingEventsToday = parseInt(todayFuelLogs[0]?.getDataValue('total_events') || 0, 10);

    // 7-day bar chart data for total fuel consumption across all users
    // Build date list from 6 days ago up to today
    const days = 7;
    const dateList = [];
    const dayNames = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      dateList.push(`${y}-${m}-${da}`);
      dayNames.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    }

    const startDate = dateList[0];
    const endDate = dateList[dateList.length - 1];

    // Query sums grouped by date - aggregating all logs
    const fuelSums = await StoveUsage.findAll({
      attributes: [
        'date',
        [fn('SUM', col('fuel_used_kg')), 'total_fuel'],
        [fn('COUNT', col('id')), 'log_count']
      ],
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      group: ['date'],
      order: [['date', 'ASC']]
    });

    // Map results to a lookup by date
    const fuelByDate = {};
    fuelSums.forEach(r => {
      const date = r.getDataValue('date');
      const total_fuel = parseFloat(r.getDataValue('total_fuel') || 0);
      fuelByDate[date] = total_fuel;
    });

    const fuelChartData = dateList.map(d => {
      // Round to 2 decimals
      return Math.round((fuelByDate[d] || 0) * 100) / 100;
    });

    res.json({
      totalUsers,
      activeStoves,
      totalFuelToday,
      totalCookingEventsToday,
      fuelChartData,
      dateRange: dayNames
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const changeUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newRole } = req.body;

    // Validate input
    if (!userId || !newRole) {
      return res.status(400).json({ error: 'User ID and new role are required' });
    }

    // Validate role value against allowed enum values
    const allowedRoles = ['user', 'admin'];
    if (!allowedRoles.includes(newRole)) {
      return res.status(400).json({ error: `Invalid role. Allowed values: ${allowedRoles.join(', ')}` });
    }
    

    // Find user and update role using a direct update then reload fresh data
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.update({ role: newRole });

    // Reload to ensure we return the persisted values
    const freshUser = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'role', 'created_at']
    });

    res.json({ message: 'User role updated successfully', user: freshUser });
  } catch (error) {
    console.error('Change user role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  registerStove,
  changeUserRole,
  getAllUsage,
  getAllUsers,
  getAllStoves,
  getStats
};