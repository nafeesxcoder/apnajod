const request = require('supertest');
const app = require('../src/app');

describe('Integration Tests', () => {
  let accessToken;
  let userId;

  describe('Authentication Flow', () => {
    test('POST /auth/signup - Register new user', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'testuser@example.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          age: 25,
          gender: 'M',
          city: 'Delhi',
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      accessToken = response.body.accessToken;
      userId = response.body.userId;
    });

    test('POST /auth/login - Login user', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.accessToken).toBeDefined();
    });
  });

  describe('Profile Operations', () => {
    test('GET /profile/me - Get user profile', async () => {
      const response = await request(app)
        .get('/profile/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.profile).toBeDefined();
    });

    test('PUT /profile/me - Update profile', async () => {
      const response = await request(app)
        .put('/profile/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Updated',
          about: 'Love hiking and movies',
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });
  });

  describe('Matching Features', () => {
    test('GET /matches/search - Search profiles', async () => {
      const response = await request(app)
        .get('/matches/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          city: 'Delhi',
          minAge: 20,
          maxAge: 35,
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.profiles)).toBe(true);
    });

    test('GET /matches/recommendations - Get recommendations', async () => {
      const response = await request(app)
        .get('/matches/recommendations')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.profiles)).toBe(true);
    });
  });

  describe('Safety Features', () => {
    test('POST /safety/block - Block user', async () => {
      const response = await request(app)
        .post('/safety/block')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          blockedId: 'some-user-id',
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });

    test('GET /safety/blocked - Get blocked users', async () => {
      const response = await request(app)
        .get('/safety/blocked')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.blockedUsers)).toBe(true);
    });
  });

  describe('Subscription Features', () => {
    test('GET /subscription/plans - Get plans', async () => {
      const response = await request(app)
        .get('/subscription/plans');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.plans)).toBe(true);
    });

    test('GET /subscription/check-premium - Check premium status', async () => {
      const response = await request(app)
        .get('/subscription/check-premium')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(typeof response.body.isPremium).toBe('boolean');
    });
  });

  describe('Rate Limiting', () => {
    test('API rate limiting works', async () => {
      let rateLimitHit = false;

      for (let i = 0; i < 1010; i++) {
        const response = await request(app)
          .get('/subscription/plans');

        if (response.status === 429) {
          rateLimitHit = true;
          break;
        }
      }

      expect(rateLimitHit).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('401 - Missing authorization header', async () => {
      const response = await request(app)
        .get('/profile/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    test('400 - Invalid request body', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('404 - Endpoint not found', async () => {
      const response = await request(app)
        .get('/nonexistent-endpoint');

      expect(response.status).toBe(404);
    });
  });
});
