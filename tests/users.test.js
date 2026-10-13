import { describe, expect, test } from 'vitest';
import { getAllUsers} from '../src/models/users.js';
import request from 'supertest';
import app from '../app.js';

const signedInAgent = async (identifier, password) => {
  const agent = request.agent(app);
  const loginResponse = await agent
    .post('/auth/login')
    .type('form')
    .send({ identifier, password });

  expect(loginResponse.status).toBe(302);
  return agent;
};

describe('GET /api/users', () => {
  test('returns a 401 for unauthenticated users', async () => {
    const response = await request(app).get('/api/users');

    expect(response.status).toBe(401);
  });

  test('returns only authenticated user if role is not admin', async () => {
    const agent = await signedInAgent('user', 'qwerty');

    const response = await agent.get('/api/users');

    expect(response.status).toBe(200);
    expect(response.body.users.username).toBe('user');
    expect(response.body.users).not.toHaveProperty('passwordHash');
  });

  test('returns all users if role is admin', async () => {
    const agent = await signedInAgent('admin', 'qwerty');

    const response = await agent.get('/api/users');

    expect(response.status).toBe(200);
    const users = await getAllUsers();
    expect(response.body.users.length).toBe(users.length);
    expect(response.body.users).not.toHaveProperty('passwordHash');
  });
});