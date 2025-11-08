const Stove = require('../models/Stove');
const { v4: uuidv4 } = require('uuid');

// Helper function to generate pairing code
const generatePairingCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Helper function to generate API key
const generateApiKey = () => {
  return uuidv4();
};

// User pairs a stove
const pairStove = async (req, res) => {
  try {
    const { stoveId, pairingCode } = req.body;
    const userId = req.user.id;
    const stove_id = stoveId;
    const pairing_code = pairingCode;

    // Validate input
    if (!stove_id || !pairing_code) {
      return res.status(400).json({ error: 'Stove ID and pairing code are required' });
    }

    // Find stove
    const stove = await Stove.findOne({ where: { stove_id, pairing_code } });

    if (!stove) {
      return res.status(404).json({ error: 'Invalid stove ID or pairing code' });
    }

    if (stove.status !== 'unpaired') {
      return res.status(400).json({ error: 'Stove is already paired' });
    }

    // Generate API key
    const api_key = generateApiKey();

    // Pair the stove
    await stove.update({
      user_id: userId,
      status: 'paired',
      pairing_code: null, // Invalidate pairing code
      api_key: api_key
    });

    res.json({
      message: 'Stove paired successfully',
      stove: {
        stove_id: stove.stove_id,
        model: stove.model,
        api_key: api_key
      }
    });
  } catch (error) {
    console.error('Pair stove error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Device sends stove data
const receiveStoveData = async (req, res) => {
  try {
    const { stoveId, date, cookingEvents, totalMinutes, fuelUsedKg } = req.body;
    const stove = req.stove; // Set by verifyApiKey middleware

    // Validate that stoveId matches the authenticated stove
    if (stoveId !== stove.stove_id) {
      return res.status(403).json({ error: 'Stove ID does not match authenticated device' });
    }

    // Validate input
    if (!stoveId || !date || cookingEvents === undefined || totalMinutes === undefined || fuelUsedKg === undefined) {
      return res.status(400).json({ error: 'All fields are required: stoveId, date, cookingEvents, totalMinutes, fuelUsedKg' });
    }

    const StoveUsage = require('../models/StoveUsage');

    // Always create a new record for logging purposes
    // Add timestamp to track when the data was received
    const usage = await StoveUsage.create({
      stove_id: stoveId,
      date: date,
      cooking_events: cookingEvents,
      total_minutes: totalMinutes,
      fuel_used_kg: fuelUsedKg
    });

    res.status(201).json({
      message: 'Usage data saved successfully',
      usage: usage
    });
  } catch (error) {
    console.error('Receive stove data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's stoves
const getUserStoves = async (req, res) => {
  try {
    const userId = req.user.id;
    const stoves = await Stove.findAll({
      where: { user_id: userId, status: 'paired' },
      attributes: ['id', 'stove_id', 'model', 'status', 'created_at']
    });

    res.json({ stoves });
  } catch (error) {
    console.error('Get user stoves error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  pairStove,
  receiveStoveData,
  getUserStoves,
  generatePairingCode,
  generateApiKey
};

