# Stackly AI Agency

A complete, responsive AI agency website and demo dashboard built with HTML5, CSS3, and vanilla JavaScript. No framework, build step, or package install is required.

The public site presents Stackly's services, solutions, industries, process, team, and contact flow. The dashboard includes demo analytics, charts, project management, a team directory, AI tool demos, reports, settings, and notifications.

## Quick start

Serve the project from its root folder. Do not open the HTML files directly with `file://` because navigation, session storage, and CDN resources are more reliable over HTTP.

```powershell
cd "C:\Users\WELCOME\Company Project\AI Agency"
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

You can also use any static server, for example:

```powershell
npx serve .
```

No npm install or build command is needed. Chart.js is loaded from jsDelivr only on chart pages; fonts and photography use Google Fonts and Unsplash.

## Demo account

```text
Email:    demo@stackly.ai
Password: Demo123!
```

The demo account is seeded automatically in the browser. New accounts created by Signup are also local demo accounts.

To reset projects, team members, notifications, tasks, and preferences, open **Settings > Reset demo data**. To fully reset authentication, clear site storage for the local origin in your browser.

## Pages

Public pages:

- `index.html` - home page, services, process, testimonials, CTA
- `services.html` - service detail sections
- `solutions.html` - solution use cases
- `industries.html` - industry-specific outcomes
- `about.html` - company story, team, principles
- `contact.html` - validated contact form with a local demo submission
- `login.html` - demo email/password login and optional Google sign-in
- `signup.html` - demo registration and validation
- `404.html` - custom not-found page with safe back navigation

Dashboard pages:

- `dashboard.html` - overview metrics, charts, recent projects, tasks, activity
- `analytics.html` - interactive revenue, hours, and interaction charts
- `ai-tools.html` - searchable tool library with local demo runners
- `projects.html` - project cards, table, add/edit/delete, filters
- `team.html` - team directory, add/remove members, filters
- `reports.html` - report charts, previews, print, and CSV export
- `settings.html` - profile, preferences, theme, password, demo reset
- `notifications.html` - filters, read/unread actions, delete, mark all read

Dashboard pages are protected by a client-side session guard and redirect to `login.html?next=...` when no demo session exists.

## Demo-mode boundaries

This project is intentionally honest about what is not real:

- Dashboard projects, team members, notifications, preferences, and tasks are stored in `localStorage`.
- Login sessions use `sessionStorage`.
- Charts and reports use clearly labelled sample data. CSV and text exports contain demo content, not client data.
- AI tool runs are deterministic local templates. They do not call an AI model and are not evidence of model quality.
- Contact and newsletter forms show local success messages only. No email is sent.
- No payment, CRM, HR, or production analytics system is connected.
- Google sign-in must be configured with your own OAuth client ID. The button never fakes a successful login.
- Reports can be printed to PDF through the browser, but the project does not generate PDF files server-side.

Do not enter confidential, personal, or regulated data into the demo.

## Authentication implementation

Demo passwords are salted and hashed with PBKDF2 via Web Crypto before being saved in `localStorage`. This raises the bar over plaintext storage but is still not a production authentication design. The browser is not a trusted security boundary.

Relevant storage keys:

- `stackly_demo_users` - demo account records with salts and PBKDF2 hashes
- `stackly_user` - current demo session in `sessionStorage`
- `stackly_remember_email` - optional remembered login email
- `stackly_demo_projects`
- `stackly_demo_team`
- `stackly_demo_notifications`
- `stackly_demo_prefs`
- `stackly_demo_tasks`

Passwords are never stored in plaintext, but local storage remains editable by the user.

## Production backend integration

Configure these values before loading `js/auth.js`, or edit `DEFAULT_CONFIG` at the top of `js/auth.js`:

```html
<script>
  window.STACKLY_AUTH_CONFIG = {
    loginEndpoint: "https://api.example.com/auth/login",
    signupEndpoint: "https://api.example.com/auth/signup",
    changePasswordEndpoint: "https://api.example.com/auth/password",
    googleClientId: "YOUR_GOOGLE_OAUTH_WEB_CLIENT_ID"
  };
</script>
<script src="js/auth.js" defer></script>
```

Add that configuration to `login.html`, `signup.html`, and `settings.html` before the `auth.js` include, or set the same defaults directly in `js/auth.js`.

### Request and response contract

The client sends JSON with `Content-Type: application/json` and `credentials: "include"`.

Login:

```http
POST /auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "user-password" }
```

Expected success response:

```json
{
  "user": {
    "name": "User Name",
    "email": "user@example.com"
  }
}
```

The response may also be a flat user object with `name`, `fullName`, and `email` fields.

Signup:

```http
POST /auth/signup

{ "name": "User Name", "email": "user@example.com", "password": "user-password" }
```

Change password:

```http
POST /auth/password

{ "currentPassword": "old-password", "newPassword": "new-password" }
```

Error responses should use a non-2xx status and a JSON body:

```json
{ "message": "Human-readable error message." }
```

The backend should set a secure, `HttpOnly`, `SameSite` session cookie. The frontend does not store access tokens. Use HTTPS, validate and normalise all input server-side, enforce password policy, rate-limit authentication, protect state-changing endpoints against CSRF, and verify authorization on every request.

If the API is on another origin, configure CORS for the exact frontend origin with credentials enabled. Same-origin hosting is simpler and safer.

### Google sign-in

1. Create an OAuth 2.0 Web Client ID in Google Cloud Console.
2. Add the site's exact development and production origins under **Authorized JavaScript origins**. Do not add a client secret to frontend code.
3. Set `googleClientId` in `STACKLY_AUTH_CONFIG`.
4. In production, send the returned Google ID token to your backend and verify its signature, audience, issuer, and expiry before creating a session. The current demo decodes the token client-side for display only and must not be treated as server-side verification.
5. Prefer rendering the official Google button with `google.accounts.id.renderButton()` on production domains. The demo uses One Tap prompting, which may be suppressed by browser cookie policies.

### Backend-only data

The dashboard interactions are frontend demos. To make them production-ready, add authenticated endpoints for projects, team members, notifications, reports, and preferences, then replace the `localStorage` reads and writes in `js/dashboard.js` with API calls. Enforce authorization and validation on the server.

The existing client-side auth guard is a UX redirect, not a security control. A real protected dashboard must be served only after server-side session validation, or must validate the session before loading sensitive data.

## Project structure

```text
AI Agency/
├── index.html
├── services.html
├── solutions.html
├── industries.html
├── about.html
├── contact.html
├── login.html
├── signup.html
├── 404.html
├── dashboard.html
├── analytics.html
├── ai-tools.html
├── projects.html
├── team.html
├── reports.html
├── settings.html
├── notifications.html
├── css/
│   ├── style.css
│   ├── auth.css
│   └── dashboard.css
├── js/
│   ├── main.js
│   ├── auth.js
│   ├── dashboard.js
│   └── charts.js
├── assets/
│   └── images/
└── README.md
```

There are no build artifacts, package dependencies, or generated CSS files committed.

## Testing checklist

Run syntax checks:

```powershell
node --check js/main.js
node --check js/auth.js
node --check js/dashboard.js
node --check js/charts.js
```

Manual smoke test:

1. Serve the site and open every public page from the main navigation and footer.
2. Confirm the mobile menu, dropdown navigation, image fallbacks, and 404 back button work.
3. Submit the contact form with empty, invalid, and valid values. Confirm it is clearly described as a local demo.
4. Submit the newsletter form with an invalid and valid email.
5. Log in with an incorrect password and confirm an error appears.
6. Log in with `demo@stackly.ai / Demo123!` and confirm the dashboard opens.
7. Attempt to open `dashboard.html` in a new session without logging in and confirm the redirect.
8. Change the overview range and metric. Confirm chart labels and values update.
9. Toggle overview tasks and reload to confirm persistence.
10. Add, edit, search, filter, and delete a project. Confirm metrics and tables update.
11. Add and remove a team member. Confirm the count and grid update.
12. Search and filter AI tools. Launch a tool, run the local demo, and close the modal.
13. View a report preview, change the range, export CSV, and print.
14. In Settings, change the theme, save preferences, and reload. Confirm the theme persists.
15. Try a wrong current password and confirm it is rejected without changing the password.
16. Mark notifications read, filter unread/read, toggle one, delete one, and reload.
17. Test responsive widths around 390px, 768px, 1024px, and 1440px. Confirm there is no horizontal overflow and the sidebar becomes a drawer.
18. Check the browser console for errors and the network panel for missing local files.

Automated verification performed in headless Chrome covered static links and duplicate IDs, all public pages, contact/newsletter demo flows, signup/login, Google setup fallback, chart filters, project and team CRUD, tool runner, report preview, settings theme and password validation, notifications, auth guard, mobile overflow on every page, and runtime console errors. The suite passed all 79 checks after fixes.

## Accessibility notes

- Forms use labels, inline errors, and `aria-describedby` where applicable.
- Interactive modals manage focus and support Escape.
- Dashboard navigation exposes the active page with `aria-current`.
- Toast messages use a polite live region.
- Charts include accessible labels and always have demo-data equivalents in tables or summaries.
- Reduced-motion preferences are respected by CSS animations and smooth scrolling.
- The main navigation becomes a labelled mobile menu on smaller screens.

## Deployment

The site is static and can be deployed to Netlify, Vercel, Cloudflare Pages, GitHub Pages, or any static host. Serve over HTTPS in production, update the Google authorised origin, and configure your backend endpoints before claiming any production authentication or data functionality.
