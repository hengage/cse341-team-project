## Description

Created a protected page linked to the Admin dashboard that accesses all user data the currently authenticated user is authorized to read, update, and delete.

## Requirements

- Create a new user admin page that requires authentication.
- If the user is not authenticated, redirect them to the login page.
- If the user is authenticated and has the admin role, they should see all users in the system.
- If the user is authenticated but does not have the admin role, they should see their own user information.
- The list of users should be added dynamically through a client-side JavaScript call to the API.
- Add to this page the ability to update and delete users through the API.
- - After updating or deleting a user, the list should be updated (without requiring a page refresh) to show the updated information.
- - You should create the model, controller, and route functions for the update and delete operations.
- - Make sure the routes are properly secured and only allow authorized users to perform these actions. (Any user can update or delete their own information. Admin users can update or delete any user.)
- Update the admin dashboard to include a link to the protected user admin page.

## Additional Changes:
- removed /routes/api/ as actual api routes are stored in /routes/api-routes.js
- added logout button to admin/users to test authentication / authorization
- moved admin dashboard render function to admin controller

## Endpoints

- GET /admin/users -- protected users page
#
- GET /api/users -- returns list of all users
- PUT /api/users/:id -- update given user profile
- DELETE /api/users/:id -- delete given user profile

## Testing

- /admin/users redirects to login page if user is not logged in
- /admin/users displays page with user's own profile if they do not have the 'admin' role
- /admin/users displays page with all user profiles if they have the 'admin' role
- GET /api/users returns ERROR 401 'not authenticated' if user is not signed in
- GET /api/users returns user's own profile if they do not have the 'admin' role
- GET /api/users returns all user profiles if they have the 'admin' role
- PUT /api/users/:id returns ERROR 401 'not authenticated' if user is not signed in
- PUT /api/users/:id returns ERROR 403 'not authorized' if user role is not 'admin', and :id does not match authenticated user's id
- PUT /api/users/:id returns ERROR 404 'not found' if user id is not found
- PUT /api/users/:id returns 200 'user profile updated' on a successful operation
- DELETE /api/users/:id returns ERROR 401 'not authenticated' if user is not signed in
- DELETE /api/users/:id returns ERROR 403 'not authorized' if user role is not 'admin', and :id does not match authenticated user's id
- DELETE /api/users/:id returns ERROR 404 'not found' if user id is not found
- DELETE /api/users/:id returns 200 'user profile deleted' on a successful operation