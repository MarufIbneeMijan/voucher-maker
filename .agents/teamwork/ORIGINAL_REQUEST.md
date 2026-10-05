# Original User Request

## 2026-10-01T22:32:15Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description]

Implement an in-app User Registration and Authentication engine backed by a local `users.json` file, migrate the application to `react-router-dom`, repair non-functional Save/Logout buttons, and restore full-width responsive Tailwind styling for TravelLedger.

Working directory: e:\TravelLedger
Integrity mode: development

## Requirements

### R1. User Registration & Authentication
- Initialize and maintain `server/data/users.json`.
- Pre-seed the file with default `admin` credentials (username: `admin`, password: `admin`, role: `Super Admin`) if it is empty.
- Integrate authentication securely into the frontend and backend, protecting internal routes.

### R2. React Router Migration & Button Repairs
- Migrate the frontend navigation from the legacy `activeTab` state approach to standard URL-based routing using `react-router-dom`.
- Audit backend Express API endpoints to ensure they align with the new frontend routes.
- Repair non-functional Save and Logout buttons to properly trigger state changes and API calls.

### R3. UI/UX Restoration
- Restore broken Tailwind CSS styling across the application.
- Enforce full-width mobile responsiveness, ensuring tables and grids display properly on all screen sizes.

## Acceptance Criteria

### Authentication & Data
- [ ] `server/data/users.json` is created (if missing) and seeded with the default admin user upon server start.
- [ ] Unauthenticated users are redirected to the Login screen.
- [ ] The Logout button successfully clears the session and redirects to the Login screen.

### Routing
- [ ] The application uses `react-router-dom` (`<BrowserRouter>`, `<Routes>`, `<Route>`) for all primary views (Dashboard, Entry, Statements, Reports).
- [ ] Direct URL navigation to a specific view loads the correct component.

### UI & Styling
- [ ] The application utilizes full-width containers without restrictive maximum widths (e.g., avoiding `max-w-7xl mx-auto` constraints where edge-to-edge is expected).
- [ ] Tables use responsive wrappers (`overflow-x-auto`) to prevent horizontal layout breakage on mobile devices.

## Verification
- An independent agent acting as a judge must verify the acceptance criteria using a strict rubric. The judge should test the login/logout flow, verify URL-based routing, check `users.json` creation, and inspect responsive CSS classes.
