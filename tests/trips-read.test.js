import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('Trips API read endpoints', () => {
  test('GET /api/trips returns seeded trips and pagination metadata', async () => {
    const response = await request(app).get('/api/trips');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body.data).toHaveLength(10);
    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 10,
      totalItems: 13,
      totalPages: 2,
      hasNextPage: true,
      hasPreviousPage: false
    });
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'alpine-panorama',
          name: 'Alpine Panorama Express',
          region: 'central',
          startStation: 'nagoya',
          endStation: 'toyama'
        })
      ])
    );
  });

  test('GET /api/trips/:id returns one known seeded trip', async () => {
    const response = await request(app).get('/api/trips/alpine-panorama');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual(
      expect.objectContaining({
        id: 'alpine-panorama',
        name: 'Alpine Panorama Express',
        description: expect.any(String),
        region: 'central',
        distance: 180,
        bestSeason: 'autumn'
      })
    );
  });

  test('GET /api/trips/:id returns a JSON 404 for an unknown trip', async () => {
    const response = await request(app).get('/api/trips/not-a-real-trip');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual({ message: 'Trip not found' });
  });

  test('GET /api/trips/:id/schedules returns only schedules for that trip', async () => {
    const response = await request(app).get('/api/trips/alpine-panorama/schedules');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toHaveLength(2);
    expect(response.body.map((schedule) => schedule.id)).toEqual([1, 2]);
    expect(response.body.every((schedule) => schedule.tripId === 'alpine-panorama')).toBe(true);
    expect(response.body[0]).toEqual(
      expect.objectContaining({
        departureTime: '08:30',
        arrivalTime: '13:00',
        status: true
      })
    );
  });
});
