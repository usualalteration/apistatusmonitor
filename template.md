---
name: testing for now (API Status Monitor)
repo: trustable-ai/notebooks
file: TEST-api-status-monitor.md
edited: false
---

# 1 - Application Foundation

Create a monitoring dashboard application.

Use:

- React
- Tailwind CSS

Create the initial UI with:

- Left sidebar navigation
- Dashboard page
- Monitors page
- Settings page

The sidebar must be fully functional.

Implement:

- Clickable navigation
- Active page indicator
- Working page switching
- Responsive layout

Dashboard page should show:

- Total monitors: 0
- Online: 0
- Offline: 0

Monitors page should show:

"No monitors created yet"

Settings page should show basic application settings.

Do not add backend yet.

IMPORTANT:

- Keep components separated.
- Do not create fake features.
- The application must run and every menu item must work before finishing.

---

# 2 - Monitor Management

Extend the existing application.

Keep the current layout and navigation working.

Add monitor management.

Use local React state only.

In the Monitors page implement:

Create monitor form:

- Name
- URL

After creation display monitor cards.

Each card shows:

- Name
- URL
- Status: Unknown
- Last check: Never

Add:

- Delete monitor
- Empty state
- Form validation

Update Dashboard counters using the created monitors.

IMPORTANT:

- Do not modify the sidebar behavior.
- Do not rewrite routing.
- Dashboard, Monitors and Settings pages must still open correctly.
- The application must remain fully runnable.

---

# 3 - Serverless Monitoring API

Add a backend.

Use:

- Nuvolaris OpenServerless
- Python

Create a serverless API endpoint:

POST /check

Input:

- monitor URL

Return:

- status
- response time
- timestamp

Connect React to the API.

Add a "Check Now" button on every monitor card.

When clicked:

- Call the Python API
- Update only that monitor
- Show the result in the UI

For now the backend can return simulated monitoring data.

IMPORTANT:

- Keep all existing pages working.
- Do not change navigation.
- Do not introduce databases yet.
- The user must be able to test the complete flow:
  create monitor → click check → see result.

---

# 4 - Real Monitoring and Data Storage

Extend the existing application.

Add:

- WebFetch for real HTTP checks
- PostgreSQL for monitor storage
- Redis for latest status cache

Implement:

Backend:

- Save monitors in PostgreSQL
- Use WebFetch to check URLs
- Measure response time
- Detect online/offline
- Store latest status in Redis

Frontend:

Load monitors from the backend.

Display:

- Current status
- Response time
- Last check time

Keep the existing dashboard and navigation unchanged.

IMPORTANT:

Before changing code:

- Inspect existing components.
- Modify only required files.
- Do not replace working pages.

The application must still be runnable and testable:
create monitor → save → check → see live status.

---

# 5 - Monitoring History and Events

Complete the monitoring platform.

Add:

- MongoDB for historical data

Every check should create a history record containing:

- Monitor ID
- Timestamp
- Status
- Response time
- Error message if available

Create a monitor details page.

Show:

- Check history table
- Response time chart
- Uptime percentage

Improve Dashboard:

- Total monitors
- Online monitors
- Offline monitors
- Recent failures

Keep:

- React
- Tailwind
- Nuvolaris Python API
- PostgreSQL
- Redis
- MongoDB
- WebFetch

IMPORTANT:

- Do not break existing navigation.
- Dashboard, Monitors and Settings must remain functional.
- Every feature must work after implementation.
- Keep frontend and backend modular.
