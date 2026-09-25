# Feature Set 1: Core Authentication and Authorization Specification

## 1. Scope

Feature Set 1 adds the authentication foundation for Kizuna Rail:

- User and role persistence through Mongoose.
- Imported standard roles.
- Registration, login, and logout pages and handlers.
- Password hashing.
- Session-based authentication.
- API and page authentication/authorization middleware.
- An admin-only dashboard placeholder.

This feature does not implement Feature Sets 2-5. It does not create a standard user dashboard, change booking or trip behavior, add feature-specific navigation, or protect existing booking/trip administration pages. Existing MongoDB, Mongoose, Trips, Schedules, and Bookings behavior must remain compatible.

## 2. Existing Architecture Constraints

The application currently uses:

- Express with EJS views in `src/views`.
- A main application setup in `app.js` and server startup in `server.js`.
- Native MongoDB access through `src/db/connect.js`.
- Mongoose connected to the same URI and database in `src/db/connect.js`.
- Route composition through `src/routes/router.js`.
- Active API routes in `src/routes/api-routes.js`, mounted at `/api`.
- Existing Mongoose models under `src/models` and `src/models/schemas`.
- Environment loading through Node's `--env-file=.env` scripts.

The dual-driver connection must be preserved. New user and role operations should use Mongoose models, matching the existing Feature Set 3 model pattern.

## 3. Data Models

### 3.1 User schema

Create a Mongoose User schema in `src/models/schemas/users.js`.

Required fields:

| Field | Type | Rules |
| --- | --- | --- |
| `displayName` | String | Required; trimmed |
| `username` | String | Required; trimmed, normalized, unique |
| `email` | String | Required; trimmed, normalized to lowercase, unique |
| `passwordHash` | String | Required; never expose in page/API responses |
| `role` | ObjectId reference | Required; references the Role model |

Recommended schema options:

- `timestamps: true` for `createdAt` and `updatedAt`.
- Unique indexes for normalized `username` and `email`.
- No plaintext `password` field in persisted documents.
- The password hash should be excluded from normal query serialization where practical.

Create `src/models/users.js` with model functions such as:

- `createUser(userData)`
- `getUserByUsername(username)`
- `getUserByEmail(email)`
- `getUserById(id)`
- `getAllUsers()` only if needed by a later feature; it is not required for this feature's UI.

Authentication code should compare the submitted password against `passwordHash` and should not return `passwordHash` to callers.

### 3.2 Role schema

Create a Mongoose Role schema in `src/models/schemas/roles.js`.

Required fields:

| Field | Type | Rules |
| --- | --- | --- |
| `name` | String | Required; trimmed, normalized, unique |
| `description` | String | Required or defaulted; trimmed |

Recommended schema options:

- `timestamps: true`.
- A unique index on `name`.
- A stable role identifier that can be safely stored in a session, such as the role name and/or role document ID.

Create `src/models/roles.js` with lookup functions such as:

- `getRoleByName(name)`
- `getRoleById(id)`
- `getAllRoles()` if needed by import or tests.

A User's `role` should reference a Role document rather than duplicating an uncontrolled role string in the database.

## 4. Standard Roles

Seed and import these roles:

| Role name | Description | Intended use |
| --- | --- | --- |
| `user` | Standard authenticated Kizuna Rail customer | Registration and signed-in identity |
| `admin` | Authorized application administrator | Admin dashboard access |

The role names are lowercase, stable identifiers. Registration must always assign the `user` role. A client must not be able to select or submit `admin` during registration.

## 5. Role Import and Database Initialization

Create `src/db/seeds/roles.json` containing both standard roles.

Update the database import/initialization flow so roles are actually inserted into MongoDB:

- Add `roles` to the starter collections handled by `src/db/initialize.js`.
- Ensure `src/db/import.js` uses the shared initializer and therefore imports the roles.
- Keep existing Trips, Schedules, Stations, Ticket Classes, and Trains import behavior unchanged.
- Do not seed a standard user unless the assignment specifically requests one; users should be created through registration.

Import must be idempotent in the same way as the current starter-data import: the role collection is cleared/replaced by the seed data during the normal reset/import process.

## 6. Session Design

Use `express-session` with a MongoDB-backed store such as `connect-mongo`. Configure the session middleware in `app.js` or a dedicated `src/middleware/session.js`, before routes are mounted.

Required session settings:

- `secret`: `process.env.SESSION_SECRET`.
- `resave: false`.
- `saveUninitialized: false`.
- `httpOnly: true` cookie.
- `secure: true` in production HTTPS, otherwise false for local development.
- A reasonable `sameSite` policy.
- A persistent MongoDB session store for development and production compatibility.

After successful registration or login, store the authenticated identity and role in the session. The session payload should be small and should not contain a password or password hash:

```javascript
req.session.user = {
  id: user._id.toString(),
  username: user.username,
  email: user.email,
  displayName: user.displayName,
  role: {
    id: role._id.toString(),
    name: role.name
  }
};
```

The exact internal session cookie name may use the Express default unless the implementation needs a project-specific name. The session object is the source of truth for request authentication; user data should be reloaded from MongoDB only when a current database record is needed.

Logout must destroy the session and clear the session cookie. It must not merely delete a user property from a request object.

## 7. Required Middleware API

Create `src/middleware/auth.js` with exactly these four middleware functions:

### `requireApiLogin()`

- If `req.session.user` exists, call `next()`.
- If not authenticated, return JSON with HTTP 401.
- Response shape should be consistent, for example:

```json
{
  "error": "Authentication required"
}
```

### `requirePageLogin()`

- If `req.session.user` exists, call `next()`.
- If not authenticated, redirect to `/auth/login`.
- Preserve a safe return URL only if the implementation can validate it locally and avoid open redirects.

### `requireApiRole(role)`

- If unauthenticated, return JSON with HTTP 401.
- If authenticated and the session role does not match `role`, return JSON with HTTP 403.
- If the role matches, call `next()`.
- Do not trust a role submitted in a request body or query string.

### `requirePageRole(role)`

- If unauthenticated, redirect to `/auth/login`.
- If authenticated but the role does not match, redirect to `/403`.
- If the role matches, call `next()`.

The middleware should compare the normalized role name stored in the session to the required role. The middleware should not alter existing Trips, Schedules, or Bookings routes as part of this feature.

## 8. Page Routes

Create an auth router, likely `src/routes/auth.js`, and mount it at `/auth` from `src/routes/router.js`.

| Method | Route | Access | Behavior |
| --- | --- | --- | --- |
| GET | `/auth/register` | Signed out | Render registration page |
| POST | `/auth/register` | Signed out | Validate, hash, create user with `user` role, start session, redirect to a signed-in page |
| GET | `/auth/login` | Signed out | Render login page |
| POST | `/auth/login` | Signed out | Verify credentials, start session, redirect to admin dashboard only when appropriate or another neutral signed-in destination |
| POST | `/auth/logout` | Signed in | Destroy session and redirect to `/auth/login` or `/` |
| GET | `/403` | Public | Render the 403 error page |
| GET | `/admin/dashboard` | `requirePageLogin()` and `requirePageRole('admin')` | Render the admin dashboard placeholder |

A GET logout route is not required unless the existing project or assignment explicitly requires it. POST is preferred because logout changes session state.

The registration and login pages should be implemented as EJS views:

- `src/views/auth/register.ejs`
- `src/views/auth/login.ejs`

Create an admin-only placeholder view:

- `src/views/admin/dashboard.ejs`

It must display exactly or substantially:

```text
Welcome to the Admin Dashboard
```

Create the destination for unauthorized page access:

- `src/views/errors/403.ejs`

Do not add the standard user dashboard or Feature Set 2 navigation behavior.

## 9. Request and Response Behavior

### Registration

Expected form fields:

- `displayName`
- `username`
- `email`
- `password`
- `confirmPassword`

Behavior:

1. Trim and normalize username and email.
2. Validate required fields and password confirmation.
3. Reject an existing username or email with a user-facing validation response.
4. Hash the password with bcrypt before persistence.
5. Look up the seeded `user` role.
6. Create the User document with `passwordHash` and the `user` role reference.
7. Regenerate or establish the session after registration.
8. Store the session user data described above.
9. Redirect to a neutral signed-in destination, such as `/`, unless the assignment defines another destination.

Suggested status behavior:

- `302` after successful registration.
- `400` for invalid form input.
- `409` for duplicate username or email, if the response is API-style; page forms may re-render with a validation message.
- `500` for unexpected database failures.

### Login

Expected form fields:

- `username` or `email`
- `password`

The implementation should choose one documented identifier strategy. Supporting either username or email is acceptable, but the form and model lookup must be consistent.

Behavior:

1. Normalize the identifier.
2. Find the user through the User model.
3. Load the referenced Role.
4. Compare the submitted password with `passwordHash` using bcrypt.
5. Reject invalid credentials without revealing whether the username/email or password was wrong.
6. Regenerate the session on successful login to reduce session fixation risk.
7. Store the user's identity and role in the session.
8. Redirect to the appropriate signed-in destination.

Suggested status behavior:

- `302` after successful login.
- `400` for missing fields.
- `401` for invalid credentials, or a page re-render with a generic error.
- `500` for unexpected failures.

### Logout

Behavior:

1. Destroy the current session.
2. Clear the session cookie.
3. Redirect to `/auth/login` or `/`.

Expected status: `302` after successful logout.

### Admin dashboard

- Signed-out request: redirect to `/auth/login`.
- Signed-in non-admin request: redirect to `/403`.
- Signed-in admin request: return `200` and render the dashboard page.

## 10. Signed-Out, Signed-In, and Unauthorized Behavior

### Signed out

- Registration and login pages are available.
- Protected pages redirect to `/auth/login`.
- API-protected endpoints return JSON 401.
- No password or session data is exposed in page output.

### Signed in

- Session contains the user's identity and role.
- The admin dashboard is available only to an admin.
- Login and registration pages may redirect signed-in users away from those forms if desired, but this is not required for the core feature.

### Authenticated but unauthorized

- Page middleware redirects to `/403`.
- API middleware returns JSON 403.
- No protected page content is rendered before the authorization decision.

## 11. Password and Session Security

- Store only a bcrypt password hash.
- Never log passwords, password hashes, or session secrets.
- Never include `passwordHash` in API responses or EJS locals.
- Use a configurable bcrypt work factor, with a secure default such as 12.
- Normalize email and username before uniqueness checks and login.
- Regenerate the session after successful login and registration.
- Use `httpOnly` cookies.
- Use `secure` cookies in production HTTPS.
- Use a non-default `SESSION_SECRET` in deployed environments.
- Do not use JWT unless the assignment explicitly requires token authentication.
- Do not trust client-provided roles.

## 12. API Scope

No new API endpoints are required for Feature Set 1 itself. The required API behavior is provided by `requireApiLogin()` and `requireApiRole(role)` for future protected endpoints.

If an authenticated API endpoint is later needed, it should be added under the active `src/routes/api-routes.js` router and protected explicitly. Existing Trips, Schedules, and Bookings API routes should not be changed or protected as part of this feature.

Swagger documentation for auth APIs is therefore not required for this feature. If auth API routes are added later, document them in the Swagger source that the application actually scans. The repository currently has two Swagger configurations and two API route locations, so that mismatch must be resolved deliberately before relying on generated documentation.

## 13. Files to Create

- `docs/feature-set-1-auth-spec.md` (this specification)
- `src/models/schemas/users.js`
- `src/models/schemas/roles.js`
- `src/models/users.js`
- `src/models/roles.js`
- `src/middleware/session.js`, unless session setup is kept directly in `app.js`
- `src/middleware/auth.js`
- `src/controllers/auth.js`
- `src/routes/auth.js`
- `src/views/auth/register.ejs`
- `src/views/auth/login.ejs`
- `src/views/admin/dashboard.ejs`
- `src/views/errors/403.ejs`
- `src/db/seeds/roles.json`
- `tests/auth.test.js`

## 14. Existing Files to Modify

- `package.json`
- `package-lock.json`
- `.env.example`
- Local `.env` only; do not commit its secret value
- `app.js` or the new session middleware file
- `src/middleware/global.js`, to expose the signed-in user to views if needed
- `src/routes/router.js`, to mount auth and admin routes
- `src/routes/ejs-routes.js`, only if the project keeps page routes there
- `src/db/initialize.js`
- `src/db/import.js`, if its current flow does not automatically use the shared initializer
- `src/views/partials/header.ejs`, only for the minimal auth links required by Feature Set 1

Do not modify booking, trip, schedule, or existing user-admin behavior except where a shared authentication foundation requires a wiring change. Do not add a standard user dashboard.

## 15. Dependencies and Environment Variables

Add these runtime dependencies:

- `bcryptjs` for password hashing.
- `express-session` for session middleware.
- `connect-mongo` for MongoDB-backed session storage.

Existing dependencies and the dual MongoDB/Mongoose setup remain in place.

Required new environment variable:

```text
SESSION_SECRET=<long-random-secret>
```

Optional environment variable:

```text
BCRYPT_SALT_ROUNDS=12
```

Existing required variables remain:

```text
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=kizuna-rail
```

Do not add `JWT_SECRET` unless the implementation is intentionally changed from sessions to JWTs; sessions are the specified authentication mechanism.

## 16. Test Plan

Create integration tests using the existing Vitest, Supertest, and MongoDB Memory Server setup.

### Data and import checks

- The roles seed file contains exactly `user` and `admin`.
- Database initialization imports both roles into the test database.
- The User schema requires display name, username, email, password hash, and role.
- Username and email uniqueness is enforced.

### Registration checks

- `GET /auth/register` returns `200` and renders the registration form.
- Valid registration returns a redirect.
- A User document is created with a bcrypt hash, not the plaintext password.
- New registrations always receive the `user` role.
- Duplicate username is rejected.
- Duplicate email is rejected.
- Password confirmation mismatch is rejected.
- Missing required fields are rejected.
- The response/session does not expose `passwordHash`.

### Login checks

- `GET /auth/login` returns `200` and renders the login form.
- Valid credentials create a session.
- The session contains user ID, username/email/display name, and role.
- Invalid credentials do not create a session.
- Invalid credentials return a generic failure without account enumeration details.

### Logout checks

- Authenticated logout destroys the session.
- After logout, a protected page redirects to `/auth/login`.

### Middleware checks

- `requireApiLogin()` returns JSON 401 when signed out.
- `requireApiLogin()` calls the next handler when signed in.
- `requirePageLogin()` redirects signed-out requests to `/auth/login`.
- `requirePageLogin()` allows signed-in requests through.
- `requireApiRole('admin')` returns JSON 401 when signed out.
- `requireApiRole('admin')` returns JSON 403 for an authenticated user.
- `requireApiRole('admin')` allows an authenticated admin.
- `requirePageRole('admin')` redirects signed-out users to `/auth/login`.
- `requirePageRole('admin')` redirects authenticated non-admin users to `/403`.
- `requirePageRole('admin')` allows authenticated admins.

### Admin dashboard checks

- Signed-out `GET /admin/dashboard` redirects to login.
- Signed-in standard user receives a redirect to `/403`.
- Signed-in admin receives `200` and sees `Welcome to the Admin Dashboard`.

### Compatibility checks

- Existing Trips, Schedules, Bookings, and Trains tests continue to pass.
- Existing `/api/trips`, `/api/trips/:id/schedules`, and booking flows remain unchanged.
- Lint passes.
- The application starts with the configured MongoDB connection.
