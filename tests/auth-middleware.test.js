import { describe, expect, test, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import {
  requireApiLogin,
  requireApiRole,
  requirePageLogin,
  requirePageRole
} from '../src/middleware/auth.js';

const createResponse = () => ({
  json: vi.fn(),
  redirect: vi.fn(),
  status: vi.fn().mockReturnThis()
});

const createNext = () => vi.fn();

const signedInUser = {
  id: 'user-id',
  username: 'scenic-user',
  email: 'user@example.com',
  displayName: 'Scenic User',
  role: {
    id: 'role-id',
    name: 'user'
  }
};

const signedInAdmin = {
  ...signedInUser,
  role: {
    id: 'admin-role-id',
    name: 'admin'
  }
};

describe('authentication middleware', () => {
  test('requireApiLogin returns JSON 401 when signed out', () => {
    const response = createResponse();
    const next = createNext();

    requireApiLogin()({ session: {} }, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  test('requireApiLogin calls next when signed in', () => {
    const response = createResponse();
    const next = createNext();

    requireApiLogin()({ session: { user: signedInUser } }, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(response.status).not.toHaveBeenCalled();
  });

  test('requirePageLogin redirects signed-out users', () => {
    const response = createResponse();
    const next = createNext();

    requirePageLogin()({ session: {} }, response, next);

    expect(response.redirect).toHaveBeenCalledWith('/auth/login');
    expect(next).not.toHaveBeenCalled();
  });

  test('requirePageLogin calls next when signed in', () => {
    const response = createResponse();
    const next = createNext();

    requirePageLogin()({ session: { user: signedInUser } }, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(response.redirect).not.toHaveBeenCalled();
  });

  test('requireApiRole returns JSON 401 when signed out', () => {
    const response = createResponse();
    const next = createNext();

    requireApiRole('admin')({ session: {} }, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  test('requireApiRole returns JSON 403 for a signed-in user without the role', () => {
    const response = createResponse();
    const next = createNext();

    requireApiRole('admin')({ session: { user: signedInUser } }, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  test('requireApiRole calls next for a signed-in admin', () => {
    const response = createResponse();
    const next = createNext();

    requireApiRole('admin')({ session: { user: signedInAdmin } }, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(response.status).not.toHaveBeenCalled();
  });

  test('requirePageRole redirects signed-out users to login', () => {
    const response = createResponse();
    const next = createNext();

    requirePageRole('admin')({ session: {} }, response, next);

    expect(response.redirect).toHaveBeenCalledWith('/auth/login');
    expect(next).not.toHaveBeenCalled();
  });

  test('requirePageRole redirects signed-in users without the role to 403', () => {
    const response = createResponse();
    const next = createNext();

    requirePageRole('admin')({ session: { user: signedInUser } }, response, next);

    expect(response.redirect).toHaveBeenCalledWith('/403');
    expect(next).not.toHaveBeenCalled();
  });

  test('requirePageRole calls next for a signed-in admin', () => {
    const response = createResponse();
    const next = createNext();

    requirePageRole('admin')({ session: { user: signedInAdmin } }, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(response.redirect).not.toHaveBeenCalled();
  });

  test('GET /403 returns the forbidden page with HTTP 403', async () => {
    const response = await request(app).get('/403');

    expect(response.status).toBe(403);
    expect(response.text).toContain('Access Forbidden');
});
});
