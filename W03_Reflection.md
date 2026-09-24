# W03 Assignment: Mongoose and Frontend APIs - Reflection

## 1. Feature Set Assignment
I was assigned **Feature Set 1: Trips**. My work included creating the Mongoose schema, model functions, API controllers, API routes, and refactoring the frontend to use dynamic API hydration.

## 2. Walk-through Video
[Watch the Feature Set 1 Walkthrough Video](https://drive.google.com/file/d/16n7OJWULIiZjF6KW3Q5jIQaXy7mknbME/view?usp=sharing)

## 3. GitHub Issues
I created the following issue for my feature set:
- [Feature Set 1: Refactor Trips](https://github.com/hengage/cse341-team-project/issues/5)

## 4. Pull Requests
I submitted the following pull request:
- [Feat: Implement Feature Set 1 - Trips (Mongoose & API Hydration)](https://github.com/hengage/cse341-team-project/pull/6)
- **Closes:** #5
- **Summary:** Refactored Trips to use Mongoose schemas/models and API endpoints. Updated the list page to hydrate data dynamically on the client-side.
- **Testing steps:**
    1. Verified `/api/trips` returns valid JSON data.
    2. Verified the `/trips` list page successfully fetches and renders trip data via client-side JavaScript.
    3. Confirmed navigation to trip details works.
- **Video:** Linked above.

## 5. Feature Split Decision
I decided to use a single GitHub issue for this feature set because the tasks (schema, model, controller, route, and frontend update) were tightly coupled. Implementing one piece without the others would have left the application in a broken state. Therefore, it made sense to treat it as a single cohesive unit of work.

## 6. New Knowledge
I learned how to use the HTML `<template>` element for client-side rendering. This was new to me and I found it to be a clean, efficient way to manage reusable HTML structures compared to building DOM elements or strings directly in JavaScript.

## 7. Review Preparation
To prepare my pull request for review, I:
- Ensured my branch was up-to-date with `main`.
- Ran `npm run lint` and fixed all reported styling and syntax errors.
- Added detailed testing notes to the PR description.
- Created and linked the walkthrough video so reviewers could see the feature in action.

## 8. Process Improvement
To personally help the team be more effective, I can focus on documenting dependencies more clearly. As I worked on the "Trips" feature, I realized how much it impacts the "Schedules" and "Bookings" features. Going forward, I will prioritize communicating these interdependencies in our team Microsoft Teams channel as soon as I discover them, ensuring no one else is blocked or duplicated in their work.
