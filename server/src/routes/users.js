const express = require('express');
const { body, query, validationResult } = require('express-validator');
const {
  UserRole,
  createUser,
  getAllUsers,
  getUserStats,
  findUserById,
  updateUser,
  deleteUser,
  verifyPassword
} = require('../models/user');

const router = express.Router();

/**
 * Middleware to simulate authentication
 * In production, this would verify JWT tokens
 */
function authenticate(req, _res, next) {
  // Get user from header (simulated - in production use JWT)
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'] || UserRole.USER;
  
  if (userId) {
    req.currentUser = { id: userId, role: userRole };
  } else {
    req.currentUser = null;
  }
  next();
}

/**
 * Middleware to require admin access
 */
function requireAdmin(req, res, next) {
  if (!req.currentUser || req.currentUser.role !== UserRole.ADMIN) {
    return res.status(403).json({
      error: 'User editing is restricted to administrators only. Contact an admin if you need changes made to user accounts.'
    });
  }
  next();
}

/**
 * POST /api/users/signup
 * Users sign up via the login page
 */
router.post('/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().isLength({ min: 1, max: 100 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await createUser({
        email: req.body.email,
        password: req.body.password,
        name: req.body.name,
        role: UserRole.USER // New signups are always regular users
      });
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * POST /api/users/login
 * Authenticate user
 */
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await verifyPassword(req.body.email, req.body.password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/users
 * Get all authenticated users with optional search
 */
router.get('/',
  authenticate,
  [
    query('search').optional().trim().escape()
  ],
  (req, res) => {
    try {
      const users = getAllUsers({
        search: req.query.search,
        status: req.query.status,
        role: req.query.role
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/users/stats
 * Get user statistics
 */
router.get('/stats', authenticate, (_req, res) => {
  try {
    const stats = getUserStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/:id
 * Get a specific user by ID
 */
router.get('/:id', authenticate, (req, res) => {
  try {
    const user = findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Return sanitized user (without password)
    const { password: _password, ...sanitizedUser } = user;
    res.json(sanitizedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/users/:id
 * Update a user (admin only)
 */
router.put('/:id',
  authenticate,
  requireAdmin,
  [
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('role').optional().isIn([UserRole.USER, UserRole.ADMIN]),
    body('status').optional().isIn(['active', 'inactive', 'pending'])
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const updatedUser = updateUser(req.params.id, req.body, req.currentUser);
      res.json(updatedUser);
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(403).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/users/:id
 * Delete a user (admin only)
 */
router.delete('/:id',
  authenticate,
  requireAdmin,
  (req, res) => {
    try {
      deleteUser(req.params.id, req.currentUser);
      res.status(204).send();
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(403).json({ error: error.message });
    }
  }
);

module.exports = router;
