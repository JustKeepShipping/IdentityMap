# Identity Map

Identity Map is a lightweight web application for running small group identity workshops. Participants join a session using a short code, enter identity elements across three lenses — **Given**, **Chosen** and **Core** — and then compare themselves with others to see who is most similar and most different. Facilitators can create and end sessions and purge old data. The app is built with **Next.js** (App Router) and **Supabase** (PostgreSQL, Auth, and Row‑Level Security).

## Features

- **Join Session**: Participants enter a display name, session code, provide consent, and choose whether they’re visible to others. Join codes are 6–8 characters and avoid confusing characters (no `0`, `O`, `1`, `I`).
- **My Identity**: Add tags or short text entries for each lens (Given/Chosen/Core), assign weights 1–3, update weights and delete items. Toggle your visibility or delete all of your data at any time.
- **People Map & Matches**: View a list of visible participants with similarity percentages. Switch between overall, Given, Chosen, and Core scopes. See the top 3 most similar and top 3 most different participants for the selected scope. The selected scope persists across page reloads.
- **Session Admin**: Facilitators can create sessions, see the participant count, and end sessions (setting an expiry). A purge script deletes expired sessions and associated data.
- **Privacy & Consent**: Participation is opt‑in. Visibility is off by default; only visible participants appear on others’ lists. Participants must agree to share only what they enter. “Delete my data” removes all of a participant’s records.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project**

   - Sign up or log in at [Supabase](https://supabase.com).
   - Create a new project.
   - In the SQL editor, run the script in `supabase/schema.sql` to create the necessary tables, enums, and row‑level security policies.
   - In the dashboard’s API settings, copy your project’s **URL** and **Anon key**. For running the purge script you’ll also need the **Service Role key**.

3. **Configure environment variables**

   Create a `.env.local` file in the project root with:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> # optional, used by purge script
   ```

   Replace the placeholders with values from the Supabase dashboard.

4. **Run the development server**

   ```bash
   npm run dev
   ```

   Open `http://localhost:3000` in your browser. From the landing page you can navigate to `/join` to participate in a session or `/admin` to create and manage sessions.

5. **Seed the database (optional)**

   The script `scripts/seed.ts` inserts a sample session and a few participants with identity items. To run it:

   ```bash
   npm run seed
   ```

   Adjust the script to customise titles, join codes, or identity items.

6. **Purge expired sessions (optional)**

   The `scripts/purgeExpired.ts` script removes sessions whose `expires_at` timestamp is in the past and cascades deletions to participants and identity items. It requires the **service role key**:

   ```bash
   SUPABASE_URL=<your-url> SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> \
   ts-node scripts/purgeExpired.ts
   ```

   You can schedule this command via `cron` or a Supabase scheduled function to automatically purge old data.

## Deploying to Vercel

1. Push this repository to GitHub.
2. In Vercel, create a new project and import your repo.
3. Set the environment variables (same as `.env.local`) in the Vercel dashboard.
4. Trigger a deploy. After deployment, your app will be live at `https://<your-project>.vercel.app`. Share the `/join` link with participants and access `/admin` for session management.

## QA Script (15 steps)

Use this script to verify core flows and privacy rules:

1. **Admin** creates a session via `/admin` and notes the join code.
2. **User A** visits `/join`, enters alias, session code, declines consent → sees an error preventing them from proceeding.
3. User A checks consent but toggles visibility off, joins session.
4. **User B** joins the same session, chooses to be visible, adds one Given tag on `/me`.
5. User A toggles visibility on in `/me`, adds a Core item.
6. Visiting `/map`, User A sees User B listed with an overall similarity score; top lists show B in the appropriate position.
7. Switching the scope chip to **Core** reorders the lists based on Core similarity.
8. Removing all Core items makes the Core scope show “Add at least one item…”.
9. Adding Chosen items for both participants updates the Chosen ranking.
10. Dissimilarity shown in “Top 3 Different” equals `1 – similarity`.
11. The Why panel (to be implemented in a later iteration) would display overlapping and unique tags.
12. Clicking **Delete my data** removes User A’s participant record; they disappear from all lists and are redirected to `/join`.
13. **Admin** ends the session via `/admin`.
14. Joining with the same code is now blocked (session has expired).
15. Running the purge script deletes expired sessions from the database.

## Operator Notes

- **Creating Sessions**: Use `/admin`. Each session has a unique code; share this with participants. You can create multiple sessions concurrently.
- **Monitoring Participants**: The Admin page shows how many participants have joined and whether a session is active or ended.
- **Ending Sessions**: Clicking **End Session** sets `expires_at` immediately. Participants can no longer join that session.
- **Purging Data**: Run `scripts/purgeExpired.ts` periodically to clean up expired sessions. This requires the service role key.

## Risks & Next Iteration Ideas

1. **Authentication & Authorization**: Currently the admin interface is publicly accessible and participants have no authenticated identity. Integrating Supabase Auth would allow facilitators to restrict admin access and ensure participants can edit only their own data.
2. **RLS Tightening**: Public insert/update/delete policies are enabled for ease of development. These should be restricted in production, using authenticated roles or service functions.
3. **Explainability Panel**: Implement a UI to display overlapping and unique tags for each match, using the breakdown data from the similarity function.
4. **Server‑side Similarity**: Offload similarity computation to a serverless function or scheduled job to improve performance for larger sessions and cache results.
5. **Accessibility & Styling**: Further improve keyboard navigation, add ARIA labels, and refine mobile styles. Use a design system like Tailwind or Radix UI for consistency.
6. **Persistent Sessions**: Persist the selected lens and other preferences in the database per user rather than localStorage.

Identity Map is a work in progress; contributions and feedback are welcome. This document outlines the current implementation and how to operate and deploy the application.