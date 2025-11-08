const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getUsageSummary, getStoveUsage } = require('../controllers/usageController');

router.get('/summary', verifyToken, getUsageSummary);
router.get('/stove/:stoveId', verifyToken, getStoveUsage);

module.exports = router;

