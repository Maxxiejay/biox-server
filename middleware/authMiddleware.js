const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to verify API key (for device authentication)
const verifyApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers.authorization?.split(' ')[1]; // Bearer <api_key>
    
    if (!apiKey) {
      return res.status(401).json({ error: 'No API key provided' });
    }

    const Stove = require('../models/Stove');
    const stove = await Stove.findOne({ where: { api_key: apiKey, status: 'paired' } });

    if (!stove) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    req.stove = stove;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = {
  verifyToken,
  verifyApiKey,
  requireAdmin
};

