const request = require('supertest');
const app = require('../src/index');
const { clearUsers, createUser, UserRole } = require('../src/models/user');

describe('Users API', () => {
  beforeEach(async () => {
    clearUsers();
  });

  describe('POST /api/users/signup', () => {
    it('should create a new user on signup', async () => {
      const response = await request(app)
        .post('/api/users/signup')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User'
        });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe('newuser@example.com');
      expect(response.body.name).toBe('New User');
      expect(response.body.role).toBe('user');
      expect(response.body.password).toBeUndefined();
    });

    it('should reject signup with invalid email', async () => {
      const response = await request(app)
        .post('/api/users/signup')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
    });

    it('should reject signup with short password', async () => {
      const response = await request(app)
        .post('/api/users/signup')
        .send({
          email: 'test@example.com',
          password: 'short',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
    });

    it('should reject signup with duplicate email', async () => {
      await request(app)
        .post('/api/users/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
          name: 'First User'
        });

      const response = await request(app)
        .post('/api/users/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'password456',
          name: 'Second User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/users/login', () => {
    beforeEach(async () => {
      await createUser({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('test@example.com');
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('GET /api/users', () => {
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
    });

    it('should return all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('x-user-id', 'some-user-id');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
    });

    it('should search users by name', async () => {
      const response = await request(app)
        .get('/api/users?search=john')
        .set('x-user-id', 'some-user-id');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe('John Doe');
    });

    it('should search users by email', async () => {
      const response = await request(app)
        .get('/api/users?search=user2')
        .set('x-user-id', 'some-user-id');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].email).toBe('user2@example.com');
    });
  });

  describe('GET /api/users/stats', () => {
    it('should return stats with no users', async () => {
      const response = await request(app)
        .get('/api/users/stats')
        .set('x-user-id', 'some-user-id');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        totalUsers: 0,
        activeUsers: 0,
        administrators: 0
      });
    });

    it('should return correct stats with users', async () => {
      await createUser({
        email: 'user@example.com',
        password: 'password123',
        name: 'Regular User'
      });
      await createUser({
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        role: UserRole.ADMIN
      });

      const response = await request(app)
        .get('/api/users/stats')
        .set('x-user-id', 'some-user-id');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        totalUsers: 2,
        activeUsers: 2,
        administrators: 1
      });
    });
  });

  describe('PUT /api/users/:id', () => {
    let userId;

    beforeEach(async () => {
      const user = await createUser({
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User'
      });
      userId = user.id;
    });

    it('should restrict non-admin from updating users', async () => {
      const response = await request(app)
        .put(`/api/users/${userId}`)
        .set('x-user-id', 'some-user-id')
        .set('x-user-role', 'user')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('restricted to administrators only');
    });

    it('should allow admin to update users', async () => {
      const response = await request(app)
        .put(`/api/users/${userId}`)
        .set('x-user-id', 'admin-id')
        .set('x-user-role', 'admin')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put('/api/users/non-existent-id')
        .set('x-user-id', 'admin-id')
        .set('x-user-role', 'admin')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/users/:id', () => {
    let userId;

    beforeEach(async () => {
      const user = await createUser({
        email: 'user@example.com',
        password: 'password123',
        name: 'User to Delete'
      });
      userId = user.id;
    });

    it('should restrict non-admin from deleting users', async () => {
      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .set('x-user-id', 'some-user-id')
        .set('x-user-role', 'user');

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('restricted to administrators only');
    });

    it('should allow admin to delete users', async () => {
      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .set('x-user-id', 'admin-id')
        .set('x-user-role', 'admin');

      expect(response.status).toBe(204);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .delete('/api/users/non-existent-id')
        .set('x-user-id', 'admin-id')
        .set('x-user-role', 'admin');

      expect(response.status).toBe(404);
    });
  });

  describe('Health Check', () => {
    it('should return ok status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });
});
