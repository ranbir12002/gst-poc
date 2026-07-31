# Deploying on Windows (Docker Desktop)

## Architecture

```
                 ┌─────────────────────┐
 Windows host    │   nginx (gst-nginx)  │  :80 -> host
 browser  ─────► │   reverse proxy      │
                 └──────────┬───────────┘
                             │ proxy_pass app:5000
                 ┌──────────▼───────────┐
                 │   app (gst-app)      │
                 │   node server.js     │  Express API (/api/*)
                 │   + React build      │  static files (everything else)
                 └──────────┬───────────┘
                             │ MONGO_URI
                 ┌──────────▼───────────┐
                 │   mongo (gst-mongo)  │  named volume: mongo_data
                 └───────────────────────┘
```

- `app` is one container running the built React frontend and the Express
  backend together (`backend/server.js` already serves `map-selector/build`
  as static files when `NODE_ENV=production`, and proxies everything else
  through the API routes).
- `nginx` is a separate, external reverse-proxy container in front of `app`.
- `mongo` is a separate container with a persistent named volume.

## Prerequisites

- Windows 10/11 with **Docker Desktop** (WSL2 backend recommended).
- This repo checked out locally, e.g. `C:\Users\91970\Downloads\stateGst\gst-poc`.

## First-time setup

1. Copy the compose env template and set a real Mongo password:

   ```powershell
   Copy-Item .env.docker.example .env
   notepad .env
   ```

2. Check `backend/.env` — `MONGO_URI` in there is ignored by compose (it's
   overridden to point at the `mongo` container), but `JWT_SECRET` is still
   read from it — update it to a real secret before going anywhere near
   production.

   Note: `GOOGLE_MAPS_API_KEY` (in `backend/.env`) and
   `REACT_APP_MAPBOX_TOKEN` (in `map-selector/.env`) are **not used by the
   running app** — the map pages (`AllMap.js`, `MapComponent.js`,
   `CircleManagement.js`) render via `maplibre-gl` against plain
   OpenStreetMap tiles, no token required. Safe to leave both keys out
   entirely; the Docker setup here doesn't pass either one through.

3. Build and start everything:

   ```powershell
   docker compose up -d --build
   ```

4. Open http://localhost in a browser — nginx → app → serves the React app
   and the API.

5. Check logs if something looks wrong:

   ```powershell
   docker compose logs -f app
   docker compose logs -f mongo
   ```

## Loading data into MongoDB (manual CSV/GeoJSON upload)

The backend has three ordered import scripts that read from `../new_data`
(relative to `backend/`) and write into MongoDB via Mongoose. The compose
file bind-mounts your host `./new_data` folder straight into the `app`
container at `/app/new_data`, so the workflow is:

1. Drop the source files onto the host at `./new_data/` (create the folder
   if it doesn't exist yet):
   - `wards.json` — 308 ward documents (geometry + WARD_NO/NAME/CIRCLE_NO/...)
   - `division_mapping.json` — circle name → division name lookup
   - `full_data.csv` — the business master (large, ~300MB+); must have a
     `Division`,`Circle`,`Ward` column per row

   Because this is a bind mount, no rebuild is needed — the container sees
   changes on the host immediately.

2. Run the three scripts in order inside the running `app` container —
   each depends on the previous one having populated its collection:

   ```powershell
   docker compose exec app node migrate_wards_circles.js
   docker compose exec app node migrate_divisions.js
   docker compose exec app node upload_businesses.js
   ```

   - `migrate_wards_circles.js` — wipes and rebuilds `wards` + `circles`
     from `wards.json` (circles are built by grouping wards on `CIRCLE_NO`).
   - `migrate_divisions.js` — wipes and rebuilds `divisions`, links each
     circle to its division via `division_mapping.json`.
   - `upload_businesses.js` — wipes and rebuilds `businesses` from
     `full_data.csv`. The CSV's `Division`/`Circle`/`Ward` columns are
     stored as-is on every row; the `Ward` column is additionally matched
     (case-insensitively) against `Ward.NAME` to resolve ward/circle
     references. About 30% of rows won't match any ward (`"Rural"` and a
     few other out-of-jurisdiction values) — those rows still import, just
     without a ward/circle reference. The script prints a summary of
     matched vs. unmatched rows when it finishes.

`fix_circle_business_counts.js` and `check_counts.js` are standalone
diagnostic scripts — no file dependency, safe to run any time to
spot-check counts.

3. Verify with mongosh or MongoDB Compass. The `mongo` service publishes
   `127.0.0.1:27017` to the host, so from Windows you can connect Compass to:

   ```
   mongodb://admin:<MONGO_ROOT_PASSWORD from .env>@localhost:27017/stateGst?authSource=admin
   ```

4. Large files: `full_data.csv` is 300MB+ with over a million rows. It's
   bind-mounted, not baked into the image, so container rebuilds stay fast
   — but importing it can take a while; watch `docker compose logs -f app`
   while the upload script runs.

## Updating after a code change

```powershell
docker compose up -d --build app
```

(Only rebuilds/restarts `app`; `mongo` and `nginx` are untouched, data is
preserved.)

## Stopping / resetting

```powershell
docker compose down          # stop containers, keep the mongo_data volume
docker compose down -v       # stop and DELETE the mongo_data volume (data loss)
```
