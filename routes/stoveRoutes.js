const express = require('express');
const router = express.Router();
const { verifyToken, verifyApiKey } = require('../middleware/authMiddleware');
const { pairStove, receiveStoveData, getUserStoves, receiveStoveDataOpen } = require('../controllers/stoveController');

// User routes (require JWT token)
router.get('/', verifyToken, getUserStoves);
router.post('/pair', verifyToken, pairStove);

router.post('/data-open', receiveStoveDataOpen);

// Device route (requires API key)
router.post('/data', verifyApiKey, receiveStoveData);

module.exports = router;

