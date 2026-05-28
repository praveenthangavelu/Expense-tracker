# ExpenseFlow (MERN)

## Setup (local)

### Backend
1. Copy env template:
   - `server/.env.example` → `server/.env`
2. Fill `MONGO_URI`, `JWT_SECRET`, etc.
3. Run:

```bash
cd server
npm install
npm run dev
```

### Frontend
1. Copy env template:
   - `client/.env.example` → `client/.env`
2. Run:

```bash
cd client
npm install
npm run dev
```

## Deploy notes

- **Frontend**: deploy `client` (Vite) to Vercel. Set env:
  - `VITE_API_URL=https://<backend-domain>/api`
- **Backend**: deploy `server` to Render/Railway. Set env:
  - `CLIENT_URL=https://<vercel-domain>`

## Security

- Never commit `.env` files.
- If any credentials were exposed, rotate them (MongoDB Atlas password, Google client secret).

