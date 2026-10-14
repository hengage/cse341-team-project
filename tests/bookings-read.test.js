import { afterEach, describe, expect, test, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import Booking from '../src/models/schemas/bookings.js';
import { createBooking } from '../src/models/bookings.js';

const passenger = {
  firstName: 'Aiko',
  lastName: 'Tanaka',
  email: 'aiko.tanaka@example.com',
  phone: '+81-555-0100'
};

const addBooking = async (overrides = {}) => createBooking({
  id: 'ABC123',
  createdAt: new Date('2026-09-01T12:00:00.000Z'),
  ticketClass: 'standard',
  selectedDay: '2026-10-15',
  passengers: [passenger],
  ...overrides
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/bookings read behavior', () => {
  test('returns an empty page with zeroed pagination when no bookings exist', async () => {
    const response = await request(app).get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({
      bookings: [],
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      },
      filters: {
        ticketClass: null,
        startDate: null,
        endDate: null
      }
    });
  });

  test('returns each booking with its documented fields and passengers', async () => {
    await addBooking();

    const response = await request(app).get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toHaveLength(1);
    expect(response.body.bookings[0]).toMatchObject({
      id: 'ABC123',
      createdAt: '2026-09-01T12:00:00.000Z',
      ticketClass: 'standard',
      selectedDay: '2026-10-15',
      passengers: [passenger]
    });
    expect(Array.isArray(response.body.bookings[0].passengers)).toBe(true);
  });

  test('returns every passenger stored on a booking', async () => {
    const secondPassenger = { ...passenger, firstName: 'Ren', email: 'ren.tanaka@example.com' };
    await addBooking({ passengers: [passenger, secondPassenger] });

    const response = await request(app).get('/api/bookings');

    expect(response.status).toBe(200);
    expect(response.body.bookings[0].passengers).toMatchObject([passenger, secondPassenger]);
  });

  test('returns an empty page with metadata when the page is past the last page', async () => {
    await addBooking({ id: 'one' });
    await addBooking({ id: 'two', createdAt: new Date('2026-09-02T12:00:00.000Z') });

    const response = await request(app).get('/api/bookings?page=5&limit=2');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toEqual([]);
    expect(response.body.pagination).toEqual({
      page: 5,
      limit: 2,
      totalItems: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: true
    });
  });

  test('returns an empty list when filters match no bookings', async () => {
    await addBooking({ ticketClass: 'standard' });

    const response = await request(app).get('/api/bookings?ticketClass=first');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toEqual([]);
    expect(response.body.pagination).toMatchObject({ totalItems: 0, totalPages: 0 });
    expect(response.body.filters.ticketClass).toBe('first');
  });

  test('does not modify stored bookings', async () => {
    await addBooking();

    await request(app).get('/api/bookings');

    expect(await Booking.countDocuments({})).toBe(1);
  });

  test.each([
    ['a non-numeric page', 'page=abc', 'page must be a positive integer'],
    ['a negative page', 'page=-1', 'page must be a positive integer'],
    ['a decimal page', 'page=1.5', 'page must be a positive integer'],
    ['an empty page', 'page=', 'page must be a positive integer'],
    ['repeated page parameters', 'page=1&page=2', 'page must be a positive integer'],
    ['a zero limit', 'limit=0', 'limit must be a positive integer'],
    ['a non-numeric limit', 'limit=ten', 'limit must be a positive integer'],
    ['a decimal limit', 'limit=2.5', 'limit must be a positive integer']
  ])('rejects %s with a 400 error', async (_description, query, message) => {
    const response = await request(app).get(`/api/bookings?${query}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain(message);
  });

  test.each([
    ['an empty ticket class', 'ticketClass='],
    ['a wrong-case ticket class', 'ticketClass=Premium'],
    ['repeated ticket class parameters', 'ticketClass=standard&ticketClass=first']
  ])('rejects %s with a 400 error', async (_description, query) => {
    const response = await request(app).get(`/api/bookings?${query}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('ticketClass must be one of: standard, premium, first');
  });

  test('returns a 500 error response when the database read fails', async () => {
    vi.spyOn(Booking, 'countDocuments').mockRejectedValue(new Error('Database unavailable'));

    const response = await request(app).get('/api/bookings');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Database unavailable' });
  });
});

describe('GET /trips/confirmation/:bookingId', () => {
  test('renders the confirmation page for an existing booking', async () => {
    await addBooking({ id: 'FIND42', ticketClass: 'premium', selectedDay: '2026-11-03' });

    const response = await request(app).get('/trips/confirmation/FIND42');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('FIND42');
    expect(response.text).toContain('premium');
    expect(response.text).toContain('2026-11-03');
    expect(response.text).toContain('Aiko Tanaka');
  });

  test('returns the matching booking when several bookings exist', async () => {
    await addBooking({ id: 'FIRST1', ticketClass: 'standard' });
    await addBooking({ id: 'SECOND2', ticketClass: 'first' });

    const response = await request(app).get('/trips/confirmation/SECOND2');

    expect(response.status).toBe(200);
    expect(response.text).toContain('SECOND2');
    expect(response.text).not.toContain('FIRST1');
  });

  test('returns a 404 page when the booking does not exist', async () => {
    const response = await request(app).get('/trips/confirmation/MISSING');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('Page Not Found');
  });

  test('returns a 404 page when the booking id is only a different case', async () => {
    await addBooking({ id: 'CASE99' });

    const response = await request(app).get('/trips/confirmation/case99');

    expect(response.status).toBe(404);
    expect(response.text).toContain('Page Not Found');
  });

  test('returns a 404 page for a malformed booking id', async () => {
    const response = await request(app).get(`/trips/confirmation/${encodeURIComponent('../<bad id>')}`);

    expect(response.status).toBe(404);
  });
});

describe('GET /bookings', () => {
  test('renders the bookings page shell', async () => {
    const response = await request(app).get('/bookings');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('All Bookings');
    expect(response.text).toContain('id="bookings-list"');
  });
});
