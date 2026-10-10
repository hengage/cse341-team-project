import { describe, expect, test } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import Booking from '../src/models/schemas/bookings.js';

const passenger = {
  firstName: 'Aiko',
  lastName: 'Tanaka',
  email: 'aiko.tanaka@example.com',
  phone: '+81-555-0100'
};

const bookingDoc = (id, createdAt, ticketClass = 'standard') => ({
  id,
  createdAt: new Date(createdAt),
  ticketClass,
  selectedDay: '2026-10-15',
  passengers: [passenger]
});

// insertMany builds documents in array order, so ObjectIds ascend with the array.
const seed = async (docs) => Booking.insertMany(docs.map((doc) => bookingDoc(...doc)));

const seedSequence = async (count, { createdAt = () => '2026-09-01T12:00:00.000Z', ticketClass } = {}) => {
  const docs = Array.from({ length: count }, (_, index) => [
    `b-${String(index + 1).padStart(3, '0')}`,
    createdAt(index),
    typeof ticketClass === 'function' ? ticketClass(index) : ticketClass
  ]);
  await seed(docs);
};

const ids = (response) => response.body.bookings.map((booking) => booking.id);

const getPage = async (query) => request(app).get(`/api/bookings?${query}`);

const collectAllPages = async (query, limit) => {
  const collected = [];
  let page = 1;
  let response;
  do {
    response = await getPage(`${query}&page=${page}&limit=${limit}`);
    collected.push(...ids(response));
    page += 1;
  } while (response.body.pagination.hasNextPage && page < 100);
  return collected;
};

describe('GET /api/bookings pagination boundaries', () => {
  test('reports a single page with no neighbours when results fit within the limit', async () => {
    await seedSequence(3, { createdAt: (i) => `2026-09-0${i + 1}T12:00:00.000Z` });

    const response = await getPage('limit=10');

    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 10,
      totalItems: 3,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false
    });
  });

  test('does not add an extra page when the total divides evenly by the limit', async () => {
    await seedSequence(6, { createdAt: (i) => `2026-09-0${i + 1}T12:00:00.000Z` });

    const lastPage = await getPage('page=3&limit=2');

    expect(lastPage.body.pagination).toEqual({
      page: 3,
      limit: 2,
      totalItems: 6,
      totalPages: 3,
      hasNextPage: false,
      hasPreviousPage: true
    });
    expect(lastPage.body.bookings).toHaveLength(2);
  });

  test('rounds total pages up and returns a short final page', async () => {
    await seedSequence(7, { createdAt: (i) => `2026-09-0${i + 1}T12:00:00.000Z` });

    const lastPage = await getPage('page=3&limit=3');

    expect(lastPage.body.bookings).toHaveLength(1);
    expect(lastPage.body.pagination).toMatchObject({ totalItems: 7, totalPages: 3, hasNextPage: false });
  });

  test('marks a middle page as having both next and previous pages', async () => {
    await seedSequence(9, { createdAt: (i) => `2026-09-0${i + 1}T12:00:00.000Z` });

    const response = await getPage('page=2&limit=3');

    expect(response.body.pagination).toMatchObject({
      page: 2,
      hasNextPage: true,
      hasPreviousPage: true
    });
  });

  test('works with the smallest page size of one booking per page', async () => {
    await seedSequence(3, { createdAt: (i) => `2026-09-0${i + 1}T12:00:00.000Z` });

    const first = await getPage('page=1&limit=1');
    const last = await getPage('page=3&limit=1');

    expect(ids(first)).toEqual(['b-003']);
    expect(first.body.pagination).toMatchObject({ totalPages: 3, hasNextPage: true, hasPreviousPage: false });
    expect(ids(last)).toEqual(['b-001']);
    expect(last.body.pagination).toMatchObject({ totalPages: 3, hasNextPage: false, hasPreviousPage: true });
  });

  test('returns exactly 50 bookings at the maximum limit with a 51st on page two', async () => {
    await seedSequence(51, { createdAt: (i) => new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString() });

    const first = await getPage('limit=50');
    const second = await getPage('limit=50&page=2');

    expect(first.body.bookings).toHaveLength(50);
    expect(first.body.pagination).toMatchObject({ totalItems: 51, totalPages: 2, hasNextPage: true });
    expect(ids(second)).toEqual(['b-001']);
    expect(second.body.pagination).toMatchObject({ hasNextPage: false, hasPreviousPage: true });
  });

  test('returns an empty final-plus-one page with consistent metadata', async () => {
    await seedSequence(4, { createdAt: (i) => `2026-09-0${i + 1}T12:00:00.000Z` });

    const response = await getPage('page=3&limit=2');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toEqual([]);
    expect(response.body.pagination).toEqual({
      page: 3,
      limit: 2,
      totalItems: 4,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true
    });
  });

  test('reports no previous page when requesting a later page of an empty collection', async () => {
    const response = await getPage('page=4&limit=5');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toEqual([]);
    expect(response.body.pagination).toEqual({
      page: 4,
      limit: 5,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false
    });
  });

  test('accepts numeric query values with leading zeros', async () => {
    await seedSequence(3, { createdAt: (i) => `2026-09-0${i + 1}T12:00:00.000Z` });

    const response = await getPage('page=02&limit=01');

    expect(response.status).toBe(200);
    expect(response.body.pagination).toMatchObject({ page: 2, limit: 1 });
    expect(ids(response)).toEqual(['b-002']);
  });

  test('echoes the default page and limit when only filters are supplied', async () => {
    await seedSequence(2, { ticketClass: 'first', createdAt: (i) => `2026-09-0${i + 1}T12:00:00.000Z` });

    const response = await getPage('ticketClass=first');

    expect(response.body.pagination).toMatchObject({ page: 1, limit: 10 });
  });
});

describe('GET /api/bookings pagination validation', () => {
  test.each([
    ['page', 'page=+1'],
    ['page', 'page=1e2'],
    ['page', 'page=0x10'],
    ['page', 'page=%201'],
    ['page', 'page=99999999999999999999'],
    ['limit', 'limit=-5'],
    ['limit', 'limit='],
    ['limit', 'limit=1e1'],
    ['limit', 'limit=1&limit=2'],
    ['limit', 'limit=99999999999999999999']
  ])('rejects %s value in "%s" and returns no bookings', async (parameter, query) => {
    await seedSequence(1);

    const response = await getPage(query);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain(`${parameter} must be a positive integer`);
    expect(response.body).not.toHaveProperty('bookings');
  });

  test('reports the maximum limit in the limit error message', async () => {
    const response = await getPage('limit=51');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('limit must be a positive integer no greater than 50.');
  });

  test('validates page before limit when both are invalid', async () => {
    const response = await getPage('page=0&limit=0');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('page must be a positive integer');
  });

  test('ignores unknown query parameters', async () => {
    await seedSequence(2, { createdAt: (i) => `2026-09-0${i + 1}T12:00:00.000Z` });

    const response = await getPage('sort=asc&foo=bar');

    expect(response.status).toBe(200);
    expect(ids(response)).toEqual(['b-002', 'b-001']);
  });
});

describe('GET /api/bookings sorting stability', () => {
  test('orders bookings with identical timestamps by newest insertion first', async () => {
    await seedSequence(5);

    const response = await getPage('limit=5');

    expect(ids(response)).toEqual(['b-005', 'b-004', 'b-003', 'b-002', 'b-001']);
  });

  test('keeps identical-timestamp bookings in the same order across page boundaries', async () => {
    await seedSequence(5);

    const first = await getPage('page=1&limit=2');
    const second = await getPage('page=2&limit=2');
    const third = await getPage('page=3&limit=2');

    expect(ids(first)).toEqual(['b-005', 'b-004']);
    expect(ids(second)).toEqual(['b-003', 'b-002']);
    expect(ids(third)).toEqual(['b-001']);
  });

  test('returns every booking exactly once when paging through identical timestamps', async () => {
    await seedSequence(23);

    const collected = await collectAllPages('', 5);

    expect(collected).toHaveLength(23);
    expect(new Set(collected).size).toBe(23);
  });

  test('sorts by timestamp first and uses insertion order only to break ties', async () => {
    await seed([
      ['old-tie-a', '2026-01-01T00:00:00.000Z'],
      ['new-tie-a', '2026-02-01T00:00:00.000Z'],
      ['old-tie-b', '2026-01-01T00:00:00.000Z'],
      ['new-tie-b', '2026-02-01T00:00:00.000Z']
    ]);

    const response = await getPage('limit=4');

    expect(ids(response)).toEqual(['new-tie-b', 'new-tie-a', 'old-tie-b', 'old-tie-a']);
  });

  test('distinguishes timestamps that differ by a single millisecond', async () => {
    await seed([
      ['earlier', '2026-05-05T10:00:00.000Z'],
      ['later', '2026-05-05T10:00:00.001Z']
    ]);

    const response = await getPage('limit=2');

    expect(ids(response)).toEqual(['later', 'earlier']);
  });

  test('returns the same ordering on repeated identical requests', async () => {
    await seedSequence(8);

    const first = await getPage('limit=4&page=2');
    const second = await getPage('limit=4&page=2');

    expect(ids(first)).toEqual(ids(second));
  });

  test('applies the same stable ordering to filtered results', async () => {
    await seedSequence(6, { ticketClass: (i) => (i % 2 === 0 ? 'premium' : 'standard') });

    const response = await getPage('ticketClass=premium&limit=3');

    expect(ids(response)).toEqual(['b-005', 'b-003', 'b-001']);
  });
});

describe('GET /api/bookings filter boundaries', () => {
  test('includes bookings on a single day when startDate equals endDate', async () => {
    await seed([
      ['day-before', '2026-10-09T23:59:59.999Z'],
      ['day-start', '2026-10-10T00:00:00.000Z'],
      ['day-end', '2026-10-10T23:59:59.999Z'],
      ['day-after', '2026-10-11T00:00:00.000Z']
    ]);

    const response = await getPage('startDate=2026-10-10&endDate=2026-10-10');

    expect(response.status).toBe(200);
    expect(ids(response)).toEqual(['day-end', 'day-start']);
    expect(response.body.pagination.totalItems).toBe(2);
  });

  test('handles an end date at the end of a month and year', async () => {
    await seed([
      ['last-moment', '2026-12-31T23:59:59.999Z'],
      ['new-year', '2027-01-01T00:00:00.000Z']
    ]);

    const response = await getPage('endDate=2026-12-31');

    expect(ids(response)).toEqual(['last-moment']);
  });

  test('accepts a valid leap day', async () => {
    await seed([
      ['leap-day', '2028-02-29T12:00:00.000Z'],
      ['next-day', '2028-03-01T12:00:00.000Z']
    ]);

    const response = await getPage('startDate=2028-02-29&endDate=2028-02-29');

    expect(response.status).toBe(200);
    expect(ids(response)).toEqual(['leap-day']);
  });

  test('uses UTC for date boundaries regardless of the time of day stored', async () => {
    await seed([
      ['late-evening-utc', '2026-10-10T23:30:00.000Z'],
      ['early-morning-utc', '2026-10-11T00:30:00.000Z']
    ]);

    const response = await getPage('startDate=2026-10-11');

    expect(ids(response)).toEqual(['early-morning-utc']);
  });

  test('returns an empty result with zero totals for a range containing no bookings', async () => {
    await seed([['booking', '2026-10-10T12:00:00.000Z']]);

    const response = await getPage('startDate=2027-01-01&endDate=2027-01-31');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toEqual([]);
    expect(response.body.pagination).toMatchObject({ totalItems: 0, totalPages: 0, hasNextPage: false });
  });

  test('does not match a ticket class that no booking uses', async () => {
    await seedSequence(3, { ticketClass: 'standard' });

    const response = await getPage('ticketClass=first');

    expect(response.body.bookings).toEqual([]);
    expect(response.body.pagination.totalItems).toBe(0);
  });

  test('treats a startDate far in the past as no lower restriction', async () => {
    await seed([['early', '1999-01-01T00:00:00.000Z'], ['late', '2026-01-01T00:00:00.000Z']]);

    const response = await getPage('startDate=0001-01-01');

    expect(response.status).toBe(200);
    expect(ids(response)).toEqual(['late', 'early']);
  });
});

describe('GET /api/bookings filter validation', () => {
  test.each([
    ['startDate', 'startDate=2026-04-31'],
    ['startDate', 'startDate=2026-13-01'],
    ['startDate', 'startDate=2026-00-10'],
    ['startDate', 'startDate=0000-01-01'],
    ['startDate', 'startDate=2026-1-1'],
    ['startDate', 'startDate='],
    ['startDate', 'startDate=2026-10-01T00:00:00Z'],
    ['startDate', 'startDate=2026-10-01&startDate=2026-10-02'],
    ['endDate', 'endDate=2027-02-29'],
    ['endDate', 'endDate=not-a-date'],
    ['endDate', 'endDate='],
    ['endDate', 'endDate=2026-10-01T00:00:00Z'],
    ['endDate', 'endDate=2026-10-01&endDate=2026-10-02']
  ])('rejects invalid %s in "%s"', async (parameter, query) => {
    await seedSequence(1);

    const response = await getPage(query);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(`${parameter} must be a valid date in YYYY-MM-DD format.`);
    expect(response.body).not.toHaveProperty('bookings');
  });

  test('still rejects a reversed range when the dates are only one day apart', async () => {
    const response = await getPage('startDate=2026-10-11&endDate=2026-10-10');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('startDate cannot be later than endDate.');
  });

  test('rejects an invalid ticket class even when other filters are valid', async () => {
    const response = await getPage('ticketClass=business&startDate=2026-10-01&endDate=2026-10-02');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('ticketClass must be one of: standard, premium, first.');
  });

  test('reports an invalid ticket class before an invalid date', async () => {
    const response = await getPage('ticketClass=business&startDate=bad');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('ticketClass must be one of');
  });

  test('reports an invalid startDate before an invalid endDate', async () => {
    const response = await getPage('startDate=bad&endDate=also-bad');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('startDate must be a valid date');
  });

  test('reports pagination errors before filter errors', async () => {
    const response = await getPage('page=0&ticketClass=business');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('page must be a positive integer');
  });

  test('rejects invalid filters regardless of valid pagination parameters', async () => {
    const response = await getPage('page=1&limit=5&ticketClass=economy');

    expect(response.status).toBe(400);
  });
});

describe('GET /api/bookings combined filters across pages', () => {
  const seedMixedBookings = async () => {
    const classes = ['standard', 'premium', 'first'];
    await seedSequence(30, {
      createdAt: (i) => `2026-10-${String(1 + Math.floor(i / 3)).padStart(2, '0')}T12:00:00.000Z`,
      ticketClass: (i) => classes[i % 3]
    });
  };

  test('totals reflect only the filtered bookings, not the whole collection', async () => {
    await seedMixedBookings();

    const unfiltered = await getPage('limit=5');
    const filtered = await getPage('ticketClass=first&limit=5');

    expect(unfiltered.body.pagination.totalItems).toBe(30);
    expect(filtered.body.pagination).toMatchObject({ totalItems: 10, totalPages: 2 });
  });

  test('pages through a class filter without repeating or skipping bookings', async () => {
    await seedMixedBookings();

    const collected = await collectAllPages('ticketClass=premium', 3);

    expect(collected).toHaveLength(10);
    expect(new Set(collected).size).toBe(10);
    const stored = await Booking.find({ ticketClass: 'premium' }).lean();
    expect(new Set(collected)).toEqual(new Set(stored.map((booking) => booking.id)));
  });

  test('pages through a date range and every result falls inside it', async () => {
    await seedMixedBookings();

    const first = await getPage('startDate=2026-10-03&endDate=2026-10-05&limit=4&page=1');
    const second = await getPage('startDate=2026-10-03&endDate=2026-10-05&limit=4&page=2');
    const third = await getPage('startDate=2026-10-03&endDate=2026-10-05&limit=4&page=3');

    expect(first.body.pagination).toMatchObject({ totalItems: 9, totalPages: 3 });
    const all = [...first.body.bookings, ...second.body.bookings, ...third.body.bookings];
    expect(all).toHaveLength(9);
    all.forEach((booking) => {
      const day = booking.createdAt.slice(0, 10);
      expect(day >= '2026-10-03' && day <= '2026-10-05').toBe(true);
    });
  });

  test('combines class and date filters across multiple pages with correct metadata', async () => {
    await seedMixedBookings();

    const query = 'ticketClass=standard&startDate=2026-10-02&endDate=2026-10-08&limit=2';
    const pageOne = await getPage(`${query}&page=1`);
    const pageTwo = await getPage(`${query}&page=2`);
    const pageThree = await getPage(`${query}&page=3`);
    const pageFour = await getPage(`${query}&page=4`);
    const collected = [...ids(pageOne), ...ids(pageTwo), ...ids(pageThree), ...ids(pageFour)];

    expect(pageOne.body.pagination).toEqual({
      page: 1,
      limit: 2,
      totalItems: 7,
      totalPages: 4,
      hasNextPage: true,
      hasPreviousPage: false
    });
    expect(pageThree.body.pagination).toMatchObject({ hasNextPage: true, hasPreviousPage: true });
    expect(pageFour.body.pagination).toMatchObject({ hasNextPage: false, hasPreviousPage: true });
    expect(pageFour.body.bookings).toHaveLength(1);
    expect(new Set(collected).size).toBe(7);

    const stored = await Booking.find({
      ticketClass: 'standard',
      createdAt: {
        $gte: new Date('2026-10-02T00:00:00.000Z'),
        $lt: new Date('2026-10-09T00:00:00.000Z')
      }
    }).lean();
    expect(new Set(collected)).toEqual(new Set(stored.map((booking) => booking.id)));
  });

  test('returns an empty page without losing totals when a filtered page is out of range', async () => {
    await seedMixedBookings();

    const response = await getPage('ticketClass=first&limit=5&page=3');

    expect(response.status).toBe(200);
    expect(response.body.bookings).toEqual([]);
    expect(response.body.pagination).toEqual({
      page: 3,
      limit: 5,
      totalItems: 10,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true
    });
  });

  test('changing the ticket class changes both results and totals', async () => {
    await seedMixedBookings();
    await seed([['extra-first', '2026-10-20T12:00:00.000Z', 'first']]);

    const standard = await getPage('ticketClass=standard&limit=50');
    const first = await getPage('ticketClass=first&limit=50');

    expect(standard.body.pagination.totalItems).toBe(10);
    expect(first.body.pagination.totalItems).toBe(11);
    expect(ids(first)).toContain('extra-first');
    expect(ids(standard)).not.toContain('extra-first');
  });

  test('changing the page returns different bookings with the same totals', async () => {
    await seedMixedBookings();

    const pageOne = await getPage('ticketClass=premium&limit=4&page=1');
    const pageTwo = await getPage('ticketClass=premium&limit=4&page=2');

    expect(ids(pageOne).filter((id) => ids(pageTwo).includes(id))).toEqual([]);
    expect(pageOne.body.pagination.totalItems).toBe(pageTwo.body.pagination.totalItems);
    expect(pageOne.body.pagination.totalPages).toBe(pageTwo.body.pagination.totalPages);
  });

  test('narrowing a date range never returns more results than the wider range', async () => {
    await seedMixedBookings();

    const wide = await getPage('startDate=2026-10-01&endDate=2026-10-10&limit=50');
    const narrow = await getPage('startDate=2026-10-04&endDate=2026-10-06&limit=50');

    expect(wide.body.pagination.totalItems).toBe(30);
    expect(narrow.body.pagination.totalItems).toBe(9);
    narrow.body.bookings.forEach((booking) => {
      expect(ids(wide)).toContain(booking.id);
    });
  });

  test('echoes every active filter alongside the paged results', async () => {
    await seedMixedBookings();

    const response = await getPage('ticketClass=first&startDate=2026-10-01&endDate=2026-10-10&page=2&limit=3');

    expect(response.body.filters).toEqual({
      ticketClass: 'first',
      startDate: '2026-10-01',
      endDate: '2026-10-10'
    });
    expect(response.body.pagination).toMatchObject({ page: 2, limit: 3, totalItems: 10 });
  });

  test('does not change stored bookings while paging and filtering', async () => {
    await seedMixedBookings();

    await getPage('ticketClass=first&limit=2&page=2');
    await getPage('startDate=2026-10-01&endDate=2026-10-02');

    expect(await Booking.countDocuments({})).toBe(30);
  });
});
