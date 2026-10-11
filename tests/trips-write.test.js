import bcrypt from 'bcryptjs';
import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { getRoleByName } from '../src/models/roles.js';
import Trip from '../src/models/schemas/trips.js';
import { createUser } from '../src/models/users.js';

const password = 'Week06-test-password';

const tripData = (id) => ({
  id,
  name: 'Week 06 Test Express',
  description: 'A temporary trip used only by the automated test database.',
  region: 'central',
  startStation: 'tokyo',
  endStation: 'nagoya',
  duration: '2 hours',
  distance: 120,
  highlights: ['Temporary database verification'],
  bestSeason: 'spring',
  operatingMonths: [3, 4, 5],
  imageUrl: '/images/routes/week06-test.png'
});

const signedInAgent = async (roleName, accountName) => {
  const role = await getRoleByName(roleName);
  const passwordHash = await bcrypt.hash(password, 4);

  await createUser({
    displayName: `${roleName} Test User`,
    username: accountName,
    email: `${accountName}@example.com`,
    passwordHash,
    role: role._id
  });

  const agent = request.agent(app);
  const loginResponse = await agent
    .post('/auth/login')
    .type('form')
    .send({ identifier: accountName, password });

  expect(loginResponse.status).toBe(302);
  return agent;
};

describe('Trips API write endpoints', () => {
  test('rejects a signed-out trip creation request', async () => {
    const response = await request(app)
      .post('/api/admin/trips')
      .send(tripData('week06-signed-out'));

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Authentication required' });
    expect(await Trip.findOne({ id: 'week06-signed-out' })).toBeNull();
  });

  test('forbids a standard user from creating a trip', async () => {
    const agent = await signedInAgent('user', 'week06-standard-user');
    const response = await agent
      .post('/api/admin/trips')
      .send(tripData('week06-forbidden'));

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Forbidden' });
    expect(await Trip.findOne({ id: 'week06-forbidden' })).toBeNull();
  });

  test('allows an administrator to create a trip and saves it', async () => {
    const agent = await signedInAgent('admin', 'week06-create-admin');
    const response = await agent
      .post('/api/admin/trips')
      .send(tripData('week06-created-trip'));

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: 'week06-created-trip',
        name: 'Week 06 Test Express',
        distance: 120
      })
    );

    const savedTrip = await Trip.findOne({ id: 'week06-created-trip' }).lean();
    expect(savedTrip).toEqual(
      expect.objectContaining({
        id: 'week06-created-trip',
        name: 'Week 06 Test Express',
        region: 'central'
      })
    );
  });

  test('allows an administrator to update a trip and persists the changes', async () => {
    await Trip.create(tripData('week06-updated-trip'));
    const agent = await signedInAgent('admin', 'week06-update-admin');
    const response = await agent
      .put('/api/admin/trips/week06-updated-trip')
      .send({ name: 'Updated Week 06 Express', distance: 245 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: 'week06-updated-trip',
        name: 'Updated Week 06 Express',
        distance: 245
      })
    );

    const updatedTrip = await Trip.findOne({ id: 'week06-updated-trip' }).lean();
    expect(updatedTrip.name).toBe('Updated Week 06 Express');
    expect(updatedTrip.distance).toBe(245);
  });

  test('allows an administrator to delete a trip and removes it', async () => {
    await Trip.create(tripData('week06-deleted-trip'));
    const agent = await signedInAgent('admin', 'week06-delete-admin');
    const response = await agent.delete('/api/admin/trips/week06-deleted-trip');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Trip deleted' });
    expect(await Trip.findOne({ id: 'week06-deleted-trip' })).toBeNull();
  });

  test('returns 404 when an administrator updates an unknown trip', async () => {
    const agent = await signedInAgent('admin', 'week06-missing-update-admin');
    const response = await agent
      .put('/api/admin/trips/not-a-real-trip')
      .send({ name: 'Does Not Exist' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Trip not found' });
  });

  test('returns 404 when an administrator deletes an unknown trip', async () => {
    const agent = await signedInAgent('admin', 'week06-missing-delete-admin');
    const response = await agent.delete('/api/admin/trips/not-a-real-trip');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Trip not found' });
  });
});
