import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { createBooking } from '../src/models/bookings.js';

const addBooking = async (id, createdAt) => createBooking({
  id,
  createdAt: new Date(createdAt),
  ticketClass: 'economy',
  selectedDay: '2026-10-15',
  passengers: []
});

describe('GET /api/bookings', () => {
  test('uses default page and limit and returns pagination metadata', async () => {
    for (let index = 1; index <= 12; index += 1) {
      await addBooking(`booking-${index}`, `2026-09-${String(index).padStart(2, '0')}T12:00:00.000Z`);
    }

    const response = await request(app).get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toHaveLength(10);
    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 10,
      totalItems: 12,
      totalPages: 2,
      hasNextPage: true,
      hasPreviousPage: false
    });
    expect(response.body.bookings[0].id).toBe('booking-12');
  });

  test('returns the requested page and limit', async () => {
    for (let index = 1; index <= 5; index += 1) {
      await addBooking(`booking-${index}`, `2026-09-${String(index).padStart(2, '0')}T12:00:00.000Z`);
    }

    const response = await request(app).get('/api/bookings?page=2&limit=2');

    expect(response.status).toBe(200);
    expect(response.body.bookings.map((booking) => booking.id)).toEqual(['booking-3', 'booking-2']);
    expect(response.body.pagination).toEqual({
      page: 2,
      limit: 2,
      totalItems: 5,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true
    });
  });

  test('allows the maximum limit of 50', async () => {
    for (let index = 1; index <= 55; index += 1) {
      await addBooking(`booking-${index}`, `2026-08-${String((index % 28) + 1).padStart(2, '0')}T12:00:00.000Z`);
    }

    const response = await request(app).get('/api/bookings?limit=50');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toHaveLength(50);
    expect(response.body.pagination).toMatchObject({
      page: 1,
      limit: 50,
      totalItems: 55,
      totalPages: 2,
      hasNextPage: true,
      hasPreviousPage: false
    });
  });

  test('rejects an invalid page', async () => {
    const response = await request(app).get('/api/bookings?page=0');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('page must be a positive integer');
  });

  test('rejects an invalid limit', async () => {
    const response = await request(app).get('/api/bookings?limit=51');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('limit must be a positive integer');
  });

  test('sorts bookings by createdAt newest first', async () => {
    await addBooking('oldest', '2026-01-01T12:00:00.000Z');
    await addBooking('newest', '2026-03-01T12:00:00.000Z');
    await addBooking('middle', '2026-02-01T12:00:00.000Z');

    const response = await request(app).get('/api/bookings?limit=3');

    expect(response.status).toBe(200);
    expect(response.body.bookings.map((booking) => booking.id)).toEqual(['newest', 'middle', 'oldest']);
  });
});