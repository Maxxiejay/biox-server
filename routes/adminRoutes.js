const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { registerStove, getAllUsage, getAllUsers, getAllStoves, getStats, changeUserRole } = require('../controllers/adminController');

// All admin routes require authentication and admin role
router.use(verifyToken, requireAdmin);

router.post('/stoves/register', registerStove);
router.patch('/users/:userId/role', changeUserRole);
router.get('/usage', getAllUsage);
router.get('/users', getAllUsers);
router.get('/stoves', getAllStoves);
router.get('/stats', getStats);

module.exports = router;

