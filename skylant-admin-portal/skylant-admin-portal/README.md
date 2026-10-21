# Skylant admin portal

The backend provides the public lead intake route `POST /api/public/leads` for
the Skylant website. Set `CLIENT_URL` in the backend environment to allow the
deployed website and portal frontend origins, `PORTAL_URL` to the portal
frontend origin for ambassador links, and the website's `VITE_API_URL` to this
backend. For local development, set the backend `PORT=5001` and the dashboard
frontend `VITE_API_URL=http://localhost:5001` if the website email server is
running on port `5000`.

Website lead submissions and campus ambassador referral registrations are
stored as dashboard leads. Group referral links and individually created
referral links both resolve to attributed registration pages. The Leads page
can export the visible filtered rows as a UTF-8 CSV that opens in Excel,
including the campus ambassador and referral-code columns.

## Deploy to Render

The repository-root `render.yaml` defines the Node API web service and the
dashboard static site. In Render, create a Blueprint from this repository and
select the `main` branch. During setup, provide the MongoDB Atlas connection
string, a valid bootstrap-admin email, and a strong bootstrap-admin password
of at least 12 characters as secret environment values. Do not commit or share
these secrets in chat.

The first deployment creates the administrator account if the configured email
is unused. Public registration is limited to sales executives; manager/admin
accounts must be provisioned by an administrator. After deployment, set
`VITE_API_URL` on the separate website hosting service to
`https://skylant-portal-dashboard-api.onrender.com` and redeploy the website.
The API CORS allowlist includes `https://www.skylanttech.com` and
`https://skylanttech.com`.

The free Render API service may spin down after inactivity. The first request
after idle can take longer while it starts.
