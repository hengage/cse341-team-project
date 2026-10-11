import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('GET /api/trips search and filtering', () => {
  test('searches trip names without regard to case', async () => {
    const response = await request(app)
      .get('/api/trips')
      .query({ q: 'ALPINE' });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Alpine Panorama Express');
    expect(response.body.pagination.totalItems).toBe(1);
  });

  test('combines region and season filters', async () => {
    const response = await request(app)
      .get('/api/trips')
      .query({ region: 'kansai', bestSeason: 'autumn' });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toEqual(
      expect.objectContaining({
        name: 'Sagano Romantic Train',
        region: 'kansai',
        bestSeason: 'autumn'
      })
    );
    expect(response.body.pagination.totalItems).toBe(1);
  });

  test('treats regex metacharacters as literal search text', async () => {
    const response = await request(app)
      .get('/api/trips')
      .query({ q: '[' });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.pagination.totalItems).toBe(0);
  });

  test('returns an empty paginated result when nothing matches', async () => {
    const response = await request(app)
      .get('/api/trips')
      .query({ q: 'no-such-trip-name' });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.pagination).toEqual(
      expect.objectContaining({
        page: 1,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      })
    );
  });
});
