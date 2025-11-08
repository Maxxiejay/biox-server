const StoveUsage = require('../models/StoveUsage');
const Stove = require('../models/Stove');
const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/db');

// Get usage summary for a user
const getUsageSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all stoves owned by user
    const userStoves = await Stove.findAll({
      where: { user_id: userId, status: 'paired' },
      attributes: ['stove_id']
    });

    if (userStoves.length === 0) {
      return res.json({
        totalFuelUsed: 0,
        averageCookingTime: 0,
        daysActive: 0,
        graph: []
      });
    }

    const stoveIds = userStoves.map(s => s.stove_id);

    // Get all usage records for user's stoves
    const usageRecords = await StoveUsage.findAll({
      where: {
        stove_id: stoveIds
      },
      order: [['date', 'ASC']]
    });

    // Calculate totals
    const totalFuelUsed = usageRecords.reduce((sum, record) => {
      return sum + parseFloat(record.fuel_used_kg || 0);
    }, 0);

    const totalMinutes = usageRecords.reduce((sum, record) => {
      return sum + parseInt(record.total_minutes || 0);
    }, 0);

    const averageCookingTime = usageRecords.length > 0
      ? Math.round(totalMinutes / usageRecords.length)
      : 0;

    const daysActive = new Set(usageRecords.map(r => r.date)).size;

    // Create graph data (grouped by date)
    const graphData = {};
    usageRecords.forEach(record => {
      const date = record.date.toISOString().split('T')[0];
      if (!graphData[date]) {
        graphData[date] = {
          date: date,
          fuelUsedKg: 0
        };
      }
      graphData[date].fuelUsedKg += parseFloat(record.fuel_used_kg || 0);
    });

    const graph = Object.values(graphData).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      totalFuelUsed: parseFloat(totalFuelUsed.toFixed(2)),
      averageCookingTime,
      daysActive,
      graph
    });
  } catch (error) {
    console.error('Get usage summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get detailed usage for a specific stove
const getStoveUsage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stoveId } = req.params;

    // Verify stove belongs to user
    const stove = await Stove.findOne({
      where: {
        stove_id: stoveId,
        user_id: userId,
        status: 'paired'
      }
    });

    if (!stove) {
      return res.status(404).json({ error: 'Stove not found or not owned by user' });
    }

    // Get usage records
    const usageRecords = await StoveUsage.findAll({
      where: { stove_id: stoveId },
      order: [['date', 'DESC']]
    });

    res.json({
      stove: {
        stove_id: stove.stove_id,
        model: stove.model
      },
      usage: usageRecords
    });
  } catch (error) {
    console.error('Get stove usage error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getUsageSummary,
  getStoveUsage
};

