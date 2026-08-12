# PortNova

PortNova is a platform for youth services, employer job posting, and learning and CV support.

## Live Deployment

- **Website (Vercel):** https://portnova-olive.vercel.app/
- **Backend (Vercel):** API deployed alongside the frontend
- **Database (Supabase):** PostgreSQL with migrations in `supabase/`

Edits pushed to the `main` branch trigger an automatic Vercel deployment.

## Setup
Install dependencies in both app folders:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Environment Variables
Backend variables live in `backend/.env` and include the server port, database connection string, JWT secrets, email credentials, DeepSeek API key, and frontend URL.

Frontend variables live in `frontend/.env` and include the API base URL and site name.

## Run
Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend:

```bash
cd frontend
npm start
```