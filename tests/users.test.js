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

describe('User pagination, search, and filtering', async() => {
  test('returns paginated results (with necessary metadata)', async () => {
    const agent = await signedInAgent('admin', 'qwerty');
    const response = await agent.get('/api/users?page=1&limit=1');

    expect(response.status).toBe(200);
    expect(response.body.users.length).toBe(1);
    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(1);
    expect(response.body.totalItems).toBe((await getAllUsers()).length);
    expect(response.body.totalPages).toBe(Math.ceil((await getAllUsers()).length / 1));
    expect(response.body.hasNextPage).toBe(true);
    expect(response.body.hasPreviousPage).toBe(false);

    const responsePage2 = await agent.get('/api/users?page=2&limit=1');
    expect(responsePage2.status).toBe(200);
    expect(responsePage2.body.users.length).toBe(1);
    expect(responsePage2.body.page).toBe(2);
    expect(responsePage2.body.limit).toBe(1);
    expect(responsePage2.body.totalItems).toBe((await getAllUsers()).length);
    expect(responsePage2.body.totalPages).toBe(Math.ceil((await getAllUsers()).length / 1));
    expect(responsePage2.body.hasNextPage).toBe(false);
    expect(responsePage2.body.hasPreviousPage).toBe(true);
  });

  test('returns results based on role filter', async () => {
    const agent = await signedInAgent('admin', 'qwerty');
    const filterText = 'admin';
    const response = await agent.get(`/api/users?q=&filter=${filterText}&limit=1&page=1`);

    expect(response.status).toBe(200);
    expect(response.body.users.length).toBe(1);
    expect(response.body.users[0].username).toBe('admin');
  });
  
  test('returns results based on search text', async () => {
    const agent = await signedInAgent('admin', 'qwerty');
    const searchText = 'admin';
    const response = await agent.get(`/api/users?q=${searchText}&filter=&limit=1&page=1`);

    console.log('Response body:', response.body); // Log the response body for debugging

    expect(response.status).toBe(200);
    expect(response.body.users.length).toBe(1);
    expect(response.body.users[0].username).toBe('admin');
  });

  test('returns empty results if no users match the search text', async () => {
    const agent = await signedInAgent('admin', 'qwerty');
    const searchText = 'nonexistentuser';
    const response = await agent.get(`/api/users?q=${searchText}&filter=&limit=1&page=1`);

    expect(response.status).toBe(200);
    expect(response.body.users.length).toBe(0);
    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(1);
    expect(response.body.totalItems).toBe(0);
    expect(response.body.totalPages).toBe(0);
    expect(response.body.hasNextPage).toBe(false);
    expect(response.body.hasPreviousPage).toBe(false);
  });

  test('returns only authenticated user if role is not admin', async () => {
    const agent = await signedInAgent('user', 'qwerty');
    const response = await agent.get('/api/users?q=&filter=&limit=1&page=1');

    expect(response.status).toBe(200);
    expect(typeof response.body.users).toBe('object');
    expect(response.body.users.username).toBe('user');
  });
});