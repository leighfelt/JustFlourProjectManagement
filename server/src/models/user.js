const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

/**
 * User role constants
 */
const UserRole = {
  USER: 'user',
  ADMIN: 'admin'
};

/**
 * User status constants
 */
const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending'
};

/**
 * In-memory user store (in production, this would be a database)
 */
const users = new Map();

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Object} Created user (without password)
 */
async function createUser(userData) {
  const { email, password, name, role = UserRole.USER } = userData;
  
  if (!email || !password || !name) {
    throw new Error('Email, password, and name are required');
  }

  // Check if user already exists
  const existingUser = findUserByEmail(email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = {
    id: uuidv4(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    name: name.trim(),
    role,
    status: UserStatus.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: null
  };

  users.set(user.id, user);
  
  return sanitizeUser(user);
}

/**
 * Find a user by ID
 * @param {string} id - User ID
 * @returns {Object|null} User or null
 */
function findUserById(id) {
  return users.get(id) || null;
}

/**
 * Find a user by email
 * @param {string} email - User email
 * @returns {Object|null} User or null
 */
function findUserByEmail(email) {
  const normalizedEmail = email.toLowerCase().trim();
  for (const user of users.values()) {
    if (user.email === normalizedEmail) {
      return user;
    }
  }
  return null;
}

/**
 * Get all users
 * @param {Object} options - Query options
 * @returns {Array} Array of users
 */
function getAllUsers(options = {}) {
  const { search, status, role } = options;
  let result = Array.from(users.values());

  if (search) {
    const searchLower = search.toLowerCase();
    result = result.filter(user => 
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  }

  if (status) {
    result = result.filter(user => user.status === status);
  }

  if (role) {
    result = result.filter(user => user.role === role);
  }

  return result.map(sanitizeUser);
}

/**
 * Get user statistics
 * @returns {Object} User statistics
 */
function getUserStats() {
  const allUsers = Array.from(users.values());
  
  return {
    totalUsers: allUsers.length,
    activeUsers: allUsers.filter(u => u.status === UserStatus.ACTIVE).length,
    administrators: allUsers.filter(u => u.role === UserRole.ADMIN).length
  };
}

/**
 * Update a user (admin only)
 * @param {string} id - User ID
 * @param {Object} updates - Updates to apply
 * @param {Object} currentUser - Current authenticated user
 * @returns {Object} Updated user
 */
function updateUser(id, updates, currentUser) {
  if (!currentUser || currentUser.role !== UserRole.ADMIN) {
    throw new Error('User editing is restricted to administrators only');
  }

  const user = users.get(id);
  if (!user) {
    throw new Error('User not found');
  }

  const allowedUpdates = ['name', 'role', 'status'];
  const sanitizedUpdates = {};
  
  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      sanitizedUpdates[key] = updates[key];
    }
  }

  const updatedUser = {
    ...user,
    ...sanitizedUpdates,
    updatedAt: new Date().toISOString()
  };

  users.set(id, updatedUser);
  
  return sanitizeUser(updatedUser);
}

/**
 * Delete a user (admin only)
 * @param {string} id - User ID
 * @param {Object} currentUser - Current authenticated user
 * @returns {boolean} Success
 */
function deleteUser(id, currentUser) {
  if (!currentUser || currentUser.role !== UserRole.ADMIN) {
    throw new Error('User deletion is restricted to administrators only');
  }

  if (!users.has(id)) {
    throw new Error('User not found');
  }

  users.delete(id);
  return true;
}

/**
 * Remove sensitive data from user object
 * @param {Object} user - User object
 * @returns {Object} Sanitized user
 */
function sanitizeUser(user) {
  const { password: _password, ...sanitizedUser } = user;
  return sanitizedUser;
}

/**
 * Verify user password
 * @param {string} email - User email
 * @param {string} password - Password to verify
 * @returns {Object|null} User if verified, null otherwise
 */
async function verifyPassword(email, password) {
  const user = findUserByEmail(email);
  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return null;
  }

  // Update last login
  user.lastLoginAt = new Date().toISOString();
  users.set(user.id, user);

  return sanitizeUser(user);
}

/**
 * Clear all users (for testing)
 */
function clearUsers() {
  users.clear();
}

module.exports = {
  UserRole,
  UserStatus,
  createUser,
  findUserById,
  findUserByEmail,
  getAllUsers,
  getUserStats,
  updateUser,
  deleteUser,
  verifyPassword,
  sanitizeUser,
  clearUsers
};
