const StoveUsage = require('../models/StoveUsage');
const Stove = require('../models/Stove');
const { Sequelize, Op, fn, col } = require('sequelize');
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

// Get stats for authenticated user (7-day fuel chart + totals)
const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all stoves owned by user (include paired and unpaired)
    const userStoves = await Stove.findAll({
      where: { user_id: userId },
      attributes: ['stove_id', 'status']
    });

  const totalStoves = userStoves.length;

    if (totalStoves === 0) {
      // Build empty 7-day structure
      const days = 7;
      const today = new Date();
      const dayNames = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        dayNames.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      }

      return res.json({
        totalStoves,
        averageCookingTime: 0,
        totalFuelToday: 0,
        totalCookingEventsToday: 0,
        fuelChartData: new Array(days).fill(0),
        dateRange: dayNames
      });
    }

    const stoveIds = userStoves.map(s => s.stove_id);

    // Today's date in YYYY-MM-DD
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Total fuel and events today for user's stoves
    const todayAgg = await StoveUsage.findAll({
      where: { stove_id: stoveIds, date: todayStr },
      attributes: [
        [fn('SUM', col('fuel_used_kg')), 'total_fuel'],
        [fn('SUM', col('cooking_events')), 'total_events']
      ]
    });

    const totalFuelToday = parseFloat(todayAgg[0]?.getDataValue('total_fuel') || 0);
    const totalCookingEventsToday = parseInt(todayAgg[0]?.getDataValue('total_events') || 0, 10);

    // 7-day date list and day names
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

    // Query sums grouped by date for user's stoves
    const fuelSums = await StoveUsage.findAll({
      attributes: ['date', [fn('SUM', col('fuel_used_kg')), 'total_fuel']],
      where: {
        stove_id: stoveIds,
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      group: ['date'],
      order: [['date', 'ASC']]
    });

    const fuelByDate = {};
    fuelSums.forEach(r => {
      const date = r.getDataValue('date');
      const total_fuel = parseFloat(r.getDataValue('total_fuel') || 0);
      fuelByDate[date] = total_fuel;
    });

    const fuelChartData = dateList.map(d => Math.round((fuelByDate[d] || 0) * 100) / 100);

    // Compute average cooking time (average minutes per cooking event) for the 7-day window
    const minutesAgg = await StoveUsage.findAll({
      where: {
        stove_id: stoveIds,
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [fn('SUM', col('total_minutes')), 'sum_minutes'],
        [fn('SUM', col('cooking_events')), 'sum_events']
      ]
    });

    const sumMinutes = parseInt(minutesAgg[0]?.getDataValue('sum_minutes') || 0, 10);
    const sumEvents = parseInt(minutesAgg[0]?.getDataValue('sum_events') || 0, 10);
    const avgCookingTime = sumEvents > 0 ? Math.round(sumMinutes / sumEvents) : 0;

    res.json({
      totalStoves,
      avgCookingTime,
      totalFuelToday,
      totalCookingEventsToday,
      fuelChartData,
      dateRange: dayNames
    });
  } catch (error) {
    console.error('Get user stats error:', error);
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
  getStoveUsage,
  getUserStats
};

