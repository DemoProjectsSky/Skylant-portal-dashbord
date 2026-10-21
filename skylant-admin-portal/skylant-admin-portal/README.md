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
