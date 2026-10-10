import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import Booking from '../src/models/schemas/bookings.js';

const validPassenger = {
  firstName: 'Aiko',
  lastName: 'Tanaka',
  email: 'aiko.tanaka@example.com',
  phone: '+81-555-0100'
};

const validBooking = () => ({
  scheduleId: '1',
  tripId: '1',
  ticketClass: 'premium',
  selectedDay: '2026-10-15',
  passengers: [validPassenger]
});

// Encodes data the way the browser form on the booking page submits it.
const toFormBody = ({ passengers = [], ...fields }) => {
  const params = new URLSearchParams(fields);
  passengers.forEach((passenger, index) => {
    Object.entries(passenger).forEach(([key, value]) => {
      params.append(`passengers[${index}][${key}]`, value);
    });
  });
  return params.toString();
};

const submitForm = (data) => request(app)
  .post('/trips/book')
  .type('form')
  .send(toFormBody(data));

describe('POST /trips/book', () => {
  test('creates a booking from a form submission and redirects to its confirmation page', async () => {
    const response = await submitForm(validBooking());

    expect(response.status).toBe(302);
    expect(response.headers.location).toMatch(/^\/trips\/confirmation\/JR[A-Z0-9]+$/);

    const bookings = await Booking.find({}).lean();
    expect(bookings).toHaveLength(1);
    expect(response.headers.location).toBe(`/trips/confirmation/${bookings[0].id}`);
  });

  test('stores the submitted ticket class, travel day and passenger details', async () => {
    await submitForm(validBooking());

    const booking = await Booking.findOne({}).lean();
    expect(booking).toMatchObject({
      ticketClass: 'premium',
      selectedDay: '2026-10-15'
    });
    expect(booking.passengers).toHaveLength(1);
    expect(booking.passengers[0]).toMatchObject(validPassenger);
  });

  test('stores every passenger submitted in the form in order', async () => {
    const secondPassenger = {
      firstName: 'Ren',
      lastName: 'Tanaka',
      email: 'ren.tanaka@example.com',
      phone: '+81-555-0101'
    };

    await submitForm({ ...validBooking(), passengers: [validPassenger, secondPassenger] });

    const booking = await Booking.findOne({}).lean();
    expect(booking.passengers).toHaveLength(2);
    expect(booking.passengers[0]).toMatchObject(validPassenger);
    expect(booking.passengers[1]).toMatchObject(secondPassenger);
  });

  test('generates a confirmation code and a creation timestamp on the server', async () => {
    const before = Date.now();

    await submitForm(validBooking());

    const booking = await Booking.findOne({}).lean();
    expect(booking.id).toMatch(/^JR[A-Z0-9]+$/);
    expect(booking.createdAt).toBeInstanceOf(Date);
    expect(booking.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(booking.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  test('does not store form fields that are not part of the booking schema', async () => {
    await submitForm(validBooking());

    const booking = await Booking.findOne({}).lean();
    expect(booking).not.toHaveProperty('scheduleId');
    expect(booking).not.toHaveProperty('tripId');
  });

  test('creates a separate booking with a different code for each submission', async () => {
    const first = await submitForm(validBooking());
    const second = await submitForm(validBooking());

    expect(await Booking.countDocuments({})).toBe(2);
    expect(first.headers.location).not.toBe(second.headers.location);
  });

  test('accepts a JSON request body', async () => {
    const response = await request(app).post('/trips/book').send(validBooking());

    expect(response.status).toBe(302);
    const booking = await Booking.findOne({}).lean();
    expect(response.headers.location).toBe(`/trips/confirmation/${booking.id}`);
    expect(booking.passengers[0]).toMatchObject(validPassenger);
  });

  test('makes the created booking available on its confirmation page and through the API', async () => {
    const created = await submitForm(validBooking());

    const confirmation = await request(app).get(created.headers.location);
    const list = await request(app).get('/api/bookings');

    expect(confirmation.status).toBe(200);
    expect(confirmation.text).toContain('Aiko Tanaka');
    expect(list.body.pagination.totalItems).toBe(1);
    expect(list.body.bookings[0]).toMatchObject({
      ticketClass: 'premium',
      selectedDay: '2026-10-15'
    });
  });

  test.each([
    ['ticketClass'],
    ['selectedDay']
  ])('rejects a booking without %s and stores nothing', async (field) => {
    const data = validBooking();
    delete data[field];

    const response = await submitForm(data);

    expect(response.status).toBe(500);
    expect(response.headers.location).toBeUndefined();
    expect(await Booking.countDocuments({})).toBe(0);
  });

  test.each([
    ['firstName'],
    ['lastName'],
    ['email'],
    ['phone']
  ])('rejects a passenger without %s and stores nothing', async (field) => {
    const { [field]: _omitted, ...incompletePassenger } = validPassenger;

    const response = await submitForm({ ...validBooking(), passengers: [incompletePassenger] });

    expect(response.status).toBe(500);
    expect(await Booking.countDocuments({})).toBe(0);
  });

  test('rejects a booking when only one of several passengers is incomplete', async () => {
    const { phone: _omitted, ...incompletePassenger } = validPassenger;

    const response = await submitForm({
      ...validBooking(),
      passengers: [validPassenger, incompletePassenger]
    });

    expect(response.status).toBe(500);
    expect(await Booking.countDocuments({})).toBe(0);
  });

  test('rejects an empty request body and stores nothing', async () => {
    const response = await request(app).post('/trips/book').type('form').send('');

    expect(response.status).toBe(500);
    expect(await Booking.countDocuments({})).toBe(0);
  });

  test('rejects malformed JSON with a client error and stores nothing', async () => {
    const response = await request(app)
      .post('/trips/book')
      .set('Content-Type', 'application/json')
      .send('{"ticketClass": ');

    expect(response.status).toBe(400);
    expect(await Booking.countDocuments({})).toBe(0);
  });

  test('does not leave a partial booking behind after a rejected submission', async () => {
    await submitForm(validBooking());
    const data = validBooking();
    delete data.selectedDay;

    await submitForm(data);

    expect(await Booking.countDocuments({})).toBe(1);
  });
});

describe('unsupported booking write operations', () => {
  test.each([
    ['POST', '/api/bookings'],
    ['PUT', '/api/bookings/ABC123'],
    ['PATCH', '/api/bookings/ABC123'],
    ['DELETE', '/api/bookings/ABC123'],
    ['PUT', '/trips/book'],
    ['DELETE', '/trips/book']
  ])('%s %s is not available and changes nothing', async (method, path) => {
    await Booking.create({
      id: 'ABC123',
      createdAt: new Date('2026-09-01T12:00:00.000Z'),
      ticketClass: 'standard',
      selectedDay: '2026-10-15',
      passengers: [validPassenger]
    });

    const response = await request(app)[method.toLowerCase()](path).send(validBooking());

    expect(response.status).toBe(404);
    const stored = await Booking.find({}).lean();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ id: 'ABC123', ticketClass: 'standard' });
  });
});
