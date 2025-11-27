const {
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
  clearUsers
} = require('../src/models/user');

describe('User Model', () => {
  beforeEach(() => {
    clearUsers();
  });

  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      const user = await createUser(userData);

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.role).toBe(UserRole.USER);
      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.password).toBeUndefined(); // Password should not be returned
    });

    it('should throw error when required fields are missing', async () => {
      await expect(createUser({ email: 'test@example.com' }))
        .rejects.toThrow('Email, password, and name are required');
    });

    it('should throw error when email already exists', async () => {
      await createUser({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });

      await expect(createUser({
        email: 'test@example.com',
        password: 'password456',
        name: 'Another User'
      })).rejects.toThrow('User with this email already exists');
    });

    it('should normalize email to lowercase', async () => {
      const user = await createUser({
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
        name: 'Test User'
      });

      expect(user.email).toBe('test@example.com');
    });
  });

  describe('findUserById', () => {
    it('should find user by id', async () => {
      const created = await createUser({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });

      const found = findUserById(created.id);
      expect(found).toBeDefined();
      expect(found.email).toBe('test@example.com');
    });

    it('should return null for non-existent id', () => {
      const found = findUserById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      await createUser({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });

      const found = findUserByEmail('test@example.com');
      expect(found).toBeDefined();
      expect(found.email).toBe('test@example.com');
    });

    it('should find user by email case-insensitively', async () => {
      await createUser({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });

      const found = findUserByEmail('TEST@EXAMPLE.COM');
      expect(found).toBeDefined();
    });

    it('should return null for non-existent email', () => {
      const found = findUserByEmail('nonexistent@example.com');
      expect(found).toBeNull();
    });
  });

  describe('getAllUsers', () => {
    beforeEach(async () => {
      await createUser({
        email: 'user1@example.com',
        password: 'password123',
        name: 'John Doe'
      });
      await createUser({
        email: 'user2@example.com',
        password: 'password123',
        name: 'Jane Smith'
      });
      await createUser({
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        role: UserRole.ADMIN
      });
    });

    it('should return all users', () => {
      const users = getAllUsers();
      expect(users.length).toBe(3);
    });

    it('should filter users by search term (name)', () => {
      const users = getAllUsers({ search: 'john' });
      expect(users.length).toBe(1);
      expect(users[0].name).toBe('John Doe');
    });

    it('should filter users by search term (email)', () => {
      const users = getAllUsers({ search: 'admin' });
      expect(users.length).toBe(1);
      expect(users[0].email).toBe('admin@example.com');
    });

    it('should filter users by role', () => {
      const users = getAllUsers({ role: UserRole.ADMIN });
      expect(users.length).toBe(1);
      expect(users[0].role).toBe(UserRole.ADMIN);
    });

    it('should not include passwords in returned users', () => {
      const users = getAllUsers();
      users.forEach(user => {
        expect(user.password).toBeUndefined();
      });
    });
  });

  describe('getUserStats', () => {
    it('should return correct stats for empty users', () => {
      const stats = getUserStats();
      expect(stats.totalUsers).toBe(0);
      expect(stats.activeUsers).toBe(0);
      expect(stats.administrators).toBe(0);
    });

    it('should return correct stats for users', async () => {
      await createUser({
        email: 'user1@example.com',
        password: 'password123',
        name: 'User 1'
      });
      await createUser({
        email: 'user2@example.com',
        password: 'password123',
        name: 'User 2'
      });
      await createUser({
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin',
        role: UserRole.ADMIN
      });

      const stats = getUserStats();
      expect(stats.totalUsers).toBe(3);
      expect(stats.activeUsers).toBe(3);
      expect(stats.administrators).toBe(1);
    });
  });

  describe('updateUser', () => {
    let adminUser;
    let regularUser;

    beforeEach(async () => {
      const created = await createUser({
        email: 'user@example.com',
        password: 'password123',
        name: 'Regular User'
      });
      regularUser = { id: created.id, role: UserRole.USER };
      
      adminUser = { id: 'admin-id', role: UserRole.ADMIN };
    });

    it('should allow admin to update user', () => {
      const updatedUser = updateUser(regularUser.id, { name: 'Updated Name' }, adminUser);
      expect(updatedUser.name).toBe('Updated Name');
    });

    it('should restrict non-admin from updating user', () => {
      expect(() => updateUser(regularUser.id, { name: 'Updated Name' }, regularUser))
        .toThrow('User editing is restricted to administrators only');
    });

    it('should throw error when user not found', () => {
      expect(() => updateUser('non-existent', { name: 'Updated' }, adminUser))
        .toThrow('User not found');
    });

    it('should only update allowed fields', () => {
      const updated = updateUser(regularUser.id, { 
        name: 'New Name',
        email: 'hacked@example.com', // Should not be updated
        password: 'hackedpassword' // Should not be updated
      }, adminUser);

      expect(updated.name).toBe('New Name');
      expect(updated.email).toBe('user@example.com');
    });
  });

  describe('deleteUser', () => {
    let adminUser;
    let regularUser;

    beforeEach(async () => {
      const created = await createUser({
        email: 'user@example.com',
        password: 'password123',
        name: 'User to Delete'
      });
      regularUser = { id: created.id, role: UserRole.USER };
      adminUser = { id: 'admin-id', role: UserRole.ADMIN };
    });

    it('should allow admin to delete user', () => {
      const result = deleteUser(regularUser.id, adminUser);
      expect(result).toBe(true);
      expect(findUserById(regularUser.id)).toBeNull();
    });

    it('should restrict non-admin from deleting user', () => {
      expect(() => deleteUser(regularUser.id, regularUser))
        .toThrow('User deletion is restricted to administrators only');
    });

    it('should throw error when user not found', () => {
      expect(() => deleteUser('non-existent', adminUser))
        .toThrow('User not found');
    });
  });

  describe('verifyPassword', () => {
    beforeEach(async () => {
      await createUser({
        email: 'test@example.com',
        password: 'correctpassword',
        name: 'Test User'
      });
    });

    it('should verify correct password', async () => {
      const user = await verifyPassword('test@example.com', 'correctpassword');
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.lastLoginAt).toBeDefined();
    });

    it('should return null for incorrect password', async () => {
      const user = await verifyPassword('test@example.com', 'wrongpassword');
      expect(user).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const user = await verifyPassword('nonexistent@example.com', 'password');
      expect(user).toBeNull();
    });
  });
});
