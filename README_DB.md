## MongoDB setup (required)

The backend uses MongoDB via `MONGO_URI` in `server/.env`.

### Option A: Docker (recommended)

From the repo root:

```bash
docker compose up -d
```

Then start the server:

```bash
cd server
npm run dev
```

### Option B: Local MongoDB install

Install MongoDB on your OS and ensure it listens on `127.0.0.1:27017`, then:

```bash
cd server
npm run dev
```

### Option C: MongoDB Atlas

Set `MONGO_URI` in `server/.env` to your Atlas connection string.

### Verify

```bash
curl http://localhost:5000/api/health
```

