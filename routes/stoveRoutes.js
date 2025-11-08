const express = require('express');
const router = express.Router();
const { verifyToken, verifyApiKey } = require('../middleware/authMiddleware');
const { pairStove, receiveStoveData, getUserStoves } = require('../controllers/stoveController');

// User routes (require JWT token)
router.get('/', verifyToken, getUserStoves);
router.post('/pair', verifyToken, pairStove);

// Device route (requires API key)
router.post('/data', verifyApiKey, receiveStoveData);

module.exports = router;

