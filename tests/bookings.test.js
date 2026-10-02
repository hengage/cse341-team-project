import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { createBooking } from '../src/models/bookings.js';

const addBooking = async (id, createdAt, ticketClass = 'standard') => createBooking({
  id,
  createdAt: new Date(createdAt),
  ticketClass,
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
    expect(response.body.filters).toEqual({
      ticketClass: null,
      startDate: null,
      endDate: null
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

  test('filters by exact standard ticket class and reports active filters', async () => {
    await addBooking('standard-booking', '2026-10-01T12:00:00.000Z', 'standard');
    await addBooking('premium-booking', '2026-10-02T12:00:00.000Z', 'premium');
    await addBooking('first-booking', '2026-10-03T12:00:00.000Z', 'first');

    const response = await request(app).get('/api/bookings?ticketClass=standard');

    expect(response.status).toBe(200);
    expect(response.body.bookings.map((booking) => booking.id)).toEqual(['standard-booking']);
    expect(response.body.filters).toEqual({
      ticketClass: 'standard',
      startDate: null,
      endDate: null
    });
    expect(response.body.pagination).toMatchObject({ totalItems: 1, totalPages: 1 });
  });

  test('filters by premium and first ticket classes', async () => {
    await addBooking('standard-booking', '2026-10-01T12:00:00.000Z', 'standard');
    await addBooking('premium-booking', '2026-10-02T12:00:00.000Z', 'premium');
    await addBooking('first-booking', '2026-10-03T12:00:00.000Z', 'first');

    const premiumResponse = await request(app).get('/api/bookings?ticketClass=premium');
    const firstResponse = await request(app).get('/api/bookings?ticketClass=first');

    expect(premiumResponse.body.bookings.map((booking) => booking.id)).toEqual(['premium-booking']);
    expect(firstResponse.body.bookings.map((booking) => booking.id)).toEqual(['first-booking']);
  });

  test('filters from the start date beginning at UTC midnight', async () => {
    await addBooking('before-start', '2026-09-30T23:59:59.999Z');
    await addBooking('at-start', '2026-10-01T00:00:00.000Z');
    await addBooking('after-start', '2026-10-01T00:00:00.001Z');

    const response = await request(app).get('/api/bookings?startDate=2026-10-01');

    expect(response.status).toBe(200);
    expect(response.body.bookings.map((booking) => booking.id)).toEqual(['after-start', 'at-start']);
    expect(response.body.filters).toEqual({
      ticketClass: null,
      startDate: '2026-10-01',
      endDate: null
    });
  });

  test('filters through the entire end date', async () => {
    await addBooking('before-end-day', '2026-10-01T23:59:59.999Z');
    await addBooking('end-day-start', '2026-10-02T00:00:00.000Z');
    await addBooking('end-day-end', '2026-10-02T23:59:59.999Z');
    await addBooking('after-end-day', '2026-10-03T00:00:00.000Z');

    const response = await request(app).get('/api/bookings?endDate=2026-10-02');

    expect(response.status).toBe(200);
    expect(response.body.bookings.map((booking) => booking.id)).toEqual([
      'end-day-end',
      'end-day-start',
      'before-end-day'
    ]);
  });

  test('filters a combined date range and includes the full end date', async () => {
    await addBooking('before-range', '2026-09-30T23:59:59.999Z');
    await addBooking('start-day', '2026-10-01T00:00:00.000Z');
    await addBooking('end-day-last-ms', '2026-10-02T23:59:59.999Z');
    await addBooking('after-range', '2026-10-03T00:00:00.000Z');

    const response = await request(app).get('/api/bookings?startDate=2026-10-01&endDate=2026-10-02');

    expect(response.status).toBe(200);
    expect(response.body.bookings.map((booking) => booking.id)).toEqual(['end-day-last-ms', 'start-day']);
    expect(response.body.pagination).toMatchObject({ totalItems: 2, totalPages: 1 });
    expect(response.body.filters).toEqual({
      ticketClass: null,
      startDate: '2026-10-01',
      endDate: '2026-10-02'
    });
  });

  test('applies filters before pagination and calculates metadata from filtered results', async () => {
    await addBooking('matching-oldest', '2026-10-02T00:00:00.000Z', 'premium');
    await addBooking('matching-middle', '2026-10-02T12:00:00.000Z', 'premium');
    await addBooking('matching-newest', '2026-10-03T23:59:59.999Z', 'premium');
    await addBooking('wrong-class', '2026-10-03T12:00:00.000Z', 'standard');
    await addBooking('outside-range', '2026-10-04T00:00:00.000Z', 'premium');

    const response = await request(app).get(
      '/api/bookings?ticketClass=premium&startDate=2026-10-02&endDate=2026-10-03&page=2&limit=2'
    );

    expect(response.status).toBe(200);
    expect(response.body.bookings.map((booking) => booking.id)).toEqual(['matching-oldest']);
    expect(response.body.pagination).toEqual({
      page: 2,
      limit: 2,
      totalItems: 3,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true
    });
    expect(response.body.filters).toEqual({
      ticketClass: 'premium',
      startDate: '2026-10-02',
      endDate: '2026-10-03'
    });
  });

  test('rejects an unsupported ticket class', async () => {
    const response = await request(app).get('/api/bookings?ticketClass=economy');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('ticketClass must be one of');
  });

  test('rejects malformed startDate and endDate values', async () => {
    const startResponse = await request(app).get('/api/bookings?startDate=10-01-2026');
    const endResponse = await request(app).get('/api/bookings?endDate=2026/10/01');

    expect(startResponse.status).toBe(400);
    expect(startResponse.body.error).toContain('startDate must be a valid date');
    expect(endResponse.status).toBe(400);
    expect(endResponse.body.error).toContain('endDate must be a valid date');
  });

  test('rejects impossible calendar dates', async () => {
    const response = await request(app).get('/api/bookings?startDate=2026-02-29');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('startDate must be a valid date');
  });

  test('rejects a startDate later than endDate', async () => {
    const response = await request(app).get('/api/bookings?startDate=2026-10-03&endDate=2026-10-02');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('startDate cannot be later than endDate');
  });
});