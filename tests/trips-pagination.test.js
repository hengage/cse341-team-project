import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('GET /api/trips pagination', () => {
  test('returns paginated trips and metadata in a stable order', async () => {
    const response = await request(app)
      .get('/api/trips')
      .query({ page: 1, limit: 5 });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(5);
    expect(response.body.pagination).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 5,
        totalItems: expect.any(Number),
        totalPages: expect.any(Number),
        hasNextPage: expect.any(Boolean),
        hasPreviousPage: false
      })
    );

    const ids = response.body.data.map((trip) => trip.id);
    expect(ids).toEqual([...ids].sort());
  });

  test.each([
    ['page', 0],
    ['limit', 0],
    ['page', 'invalid'],
    ['limit', 51]
  ])('returns 400 for invalid %s=%s', async (parameter, value) => {
    const response = await request(app)
      .get('/api/trips')
      .query({ [parameter]: value });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Invalid page or limit' });
  });
});

describe('GET /trips/:tripId', () => {
  test('renders an existing trip with its schedules', async () => {
    const response = await request(app).get('/trips/alpine-panorama');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Alpine Panorama Express');
    expect(response.text).toContain('Available Schedules');
  });

  test('returns 404 when the trip does not exist', async () => {
    const response = await request(app).get('/trips/not-a-real-trip');

    expect(response.status).toBe(404);
    expect(response.text).toContain('Page Not Found');
  });
});
