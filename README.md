# Dhira — धीरा

A personal writing website with a built-in CMS admin panel.

- **Frontend** — static HTML/CSS/JS, deployed on **GitHub Pages**
- **Backend** — Node.js + Express + MongoDB Atlas, deployed on **Render**
- The two are connected by a single config value: `frontend/config.js`

```
dhira/
├── frontend/        → deploy to GitHub Pages
│   ├── index.html        (home)
│   ├── personal.html     (category: personal)
│   ├── thoughts.html     (category: thoughts)
│   ├── book.html         (category: book)
│   ├── contact.html
│   ├── admin.html        (CMS login + dashboard)
│   ├── config.js         ← the ONE place you set your backend URL
│   └── style.css
│
├── backend/          → deploy to Render
│   ├── server.js
│   ├── package.json
│   ├── .env.example       (copy to .env locally — never commit .env)
│   ├── models/            (Post.js, Admin.js — Mongoose schemas)
│   ├── routes/            (auth.js, posts.js — Express routes)
│   ├── middleware/auth.js (JWT verification)
│   └── scripts/seedAdmin.js
│
└── render.yaml        → optional one-click Render Blueprint
```

## How it's connected

The frontend never talks to a database directly — every page that needs
data (`personal.html`, `thoughts.html`, `book.html`, `admin.html`) calls
your Render API using the URL defined in `frontend/config.js`:

```js
const DHIRA_CONFIG = {
  API_BASE: 'https://YOUR-RENDER-APP-NAME.onrender.com/api',
};
```

The backend only accepts requests from origins listed in its
`ALLOWED_ORIGINS` environment variable (CORS), which you set to your
GitHub Pages URL. That's the entire connection — one URL on each side.

## Deploy: step by step

### 1. Push this repo to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dhira.git
git push -u origin main
```

### 2. Create a free MongoDB Atlas cluster

1. Go to https://www.mongodb.com/cloud/atlas → create a free (M0) cluster.
2. Database Access → add a user with a strong password.
3. Network Access → Allow access from anywhere (`0.0.0.0/0`) — Render's
   outbound IPs are dynamic on the free plan.
4. Clusters → Connect → Drivers → copy the connection string. It looks like:
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/dhira?retryWrites=true&w=majority`

### 3. Deploy the backend to Render

**Option A — manual:**
1. https://dashboard.render.com → New → Web Service → connect this GitHub repo.
2. Root Directory: `backend`
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Add the environment variables below.

**Option B — one-click Blueprint:** Render → New → Blueprint → select this
repo. Render reads `render.yaml` and creates the service for you; you'll
just be prompted to fill in the secret values.

**Environment variables to set in Render:**

| Variable | Value |
|---|---|
| `MONGODB_URI` | your Atlas connection string from step 2 |
| `JWT_SECRET` | a long random string — generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `ALLOWED_ORIGINS` | `https://YOUR_USERNAME.github.io` |
| `ADMIN_USERNAME` | `admin` (or your choice) |
| `ADMIN_PASSWORD` | a password you'll log in with once, then change |

Once deployed, note your live URL, e.g. `https://dhira-backend.onrender.com`.

### 4. Point the frontend at your backend

Edit `frontend/config.js`:

```js
const DHIRA_CONFIG = {
  API_BASE: 'https://dhira-backend.onrender.com/api',
};
```

Commit and push this change.

### 5. Enable GitHub Pages

1. GitHub repo → **Settings → Pages**.
2. Source: **Deploy from a branch** → Branch: `main` → Folder: `/frontend`.
3. Save. Your site will be live at:
   `https://YOUR_USERNAME.github.io/dhira/`

### 6. Seed the admin user

In Render → your service → **Shell** tab:

```bash
npm run seed-admin
```

This creates the admin account using `ADMIN_USERNAME` / `ADMIN_PASSWORD`
from your environment variables.

### 7. Log in and start writing

Go to `https://YOUR_USERNAME.github.io/dhira/admin.html`, log in with the
credentials above, and **change your password immediately** from the
Settings panel in the CMS.

## Local development

```bash
# Backend
cd backend
cp .env.example .env   # fill in your own values
npm install
npm run dev             # nodemon, http://localhost:4000

# Frontend
cd frontend
# point config.js at http://localhost:4000/api
# then serve it locally, e.g.:
npx serve .              # or the VS Code "Live Server" extension
```

For local dev, also add your local frontend origin (e.g.
`http://127.0.0.1:5500`) to `ALLOWED_ORIGINS` in your backend `.env`.

## Notes

- The free Render plan spins the backend down after inactivity; the first
  request after idle time can take ~30–60 seconds to wake it up.
- Never commit your real `.env` file — only `.env.example` is tracked.
- Public pages only ever receive posts with `published: true`; drafts are
  only visible from the admin panel.
