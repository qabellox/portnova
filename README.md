# PortNova

PortNova is a platform for youth services, employer job posting, and learning and CV support.

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