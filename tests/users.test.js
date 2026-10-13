import { describe, expect, test } from 'vitest';
import { getAllUsers, getUserByUsername } from '../src/models/users.js';
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

const newAdminUser = {
  displayName: 'New Admin User',
  userName: 'newadmin',
  email: 'newadmin@example.com',
  role: 'admin'
};

const newUser = {
  displayName: 'New User',
  userName: 'newUser',
  email: 'newuser@example.com',
  role: 'user'
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

describe ('PUT /api/users/:id', () => {
  test('returns a 401 for unauthenticated users', async () => {
    const response = await request(app).put('/api/users/1');
    expect(response.status).toBe(401);
  });

  test('returns a 403 for non-admin users changing data belonging to others', async () => {
    const agent = await signedInAgent('user', 'qwerty');

    const adminUser = await getUserByUsername('admin');

    const response = (await agent.put('/api/users/' + adminUser._id.toString()).send(newUser));

    expect(adminUser).toEqual(await getUserByUsername('admin'));
    expect(response.status).toBe(403);
  });

  test('returns a 404 if the user does not exist', async () => {
    const agent = await signedInAgent('admin', 'qwerty');

    const response = await agent.put('/api/users/1').send(newUser);
    expect(response.status).toBe(404);
  });

  test('allows admin users to update other users', async () => {
    const agent = await signedInAgent('admin', 'qwerty');
    const userToUpdate = await getUserByUsername('user');

    const response = await agent.put('/api/users/' + userToUpdate._id.toString()).send(newAdminUser);
    expect(response.status).toBe(200);
    expect(await getUserByUsername('newAdminUser')).toBeDefined();
  });

  test('allows users to update their own data', async () => {
    const agent = await signedInAgent('user', 'qwerty');
    const userToUpdate = await getUserByUsername('user');

    const response = await agent.put('/api/users/' + userToUpdate._id.toString()).send(newUser);
    expect(response.status).toBe(200);
    expect(await getUserByUsername('newUser')).toBeDefined();
  });
});

describe('Create new user', () => {
  test('returns a 409 if the username already exists', async () => {
    const response = await request(app)
      .post('/auth/register')
      .type('form')
      .send({
        displayName: 'Duplicate User',
        username: 'user',
        email: 'duplicate@example.com',
        password: 'password123',
        passwordConfirmation: 'password123'
      });
    expect(response.status).toBe(409);
  });

  test('returns a 409 if the email already exists', async () => {
    const response = await request(app)
      .post('/auth/register')
      .type('form')
      .send({
        displayName: 'Duplicate Email User',
        username: 'uniqueusername',
        email: 'user@example.com',
        password: 'password123',
        passwordConfirmation: 'password123'
      });
    expect(response.status).toBe(409);
  });

  test('successfully creates a new user with unique username and email', async () => {
    const response = await request(app)
      .post('/auth/register')
      .type('form')
      .send({
        displayName: 'Unique User',
        username: 'uniqueuser',
        email: 'unique@example.com',
        password: 'password123',
        passwordConfirmation: 'password123'
      });
    expect(response.status).toBe(302);
    expect(await getUserByUsername('uniqueuser')).toBeDefined();
  });
});

describe('DELETE /api/users/:id', () => {
  test('returns a 401 for unauthenticated users', async () => {
    const response = await request(app).delete('/api/users/1');
    expect(response.status).toBe(401);
  });

  test('returns a 403 for non-admin users deleting data belonging to others', async () => {
    const agent = await signedInAgent('user', 'qwerty');

    const userToDelete = await getUserByUsername('admin');
    const response = await agent.delete('/api/users/' + userToDelete._id.toString());
    expect(response.status).toBe(403);
  });

  test('returns a 404 if the user does not exist', async () => {
    const agent = await signedInAgent('admin', 'qwerty');

    const response = await agent.delete('/api/users/1');
    expect(response.status).toBe(404);
  });

  test('allows admin users to delete other users', async () => {
    const agent = await signedInAgent('admin', 'qwerty');
    const userToDelete = await getUserByUsername('user');

    const response = await agent.delete('/api/users/' + userToDelete._id.toString());
    expect(response.status).toBe(200);
    expect(await getUserByUsername('user')).toBeNull();
  });

  test('allows users to delete their own account', async () => {
    const agent = await signedInAgent('user', 'qwerty');
    const userToDelete = await getUserByUsername('user');

    const response = await agent.delete('/api/users/' + userToDelete._id.toString());
    expect(response.status).toBe(200);
    expect(await getUserByUsername('user')).toBeNull();
  });
});