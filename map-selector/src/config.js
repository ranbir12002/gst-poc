// API base URLs — set via environment variables in production (Render)
// Falls back to localhost for local development.
// Uses ?? rather than || deliberately: an *explicitly empty* string means
// "same origin" (e.g. the Docker build, which is served behind nginx
// alongside the API) and must NOT fall back to localhost:5000 — only a
// truly-unset var (undefined, as in local `npm start` with no .env) should.
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL ?? 'http://localhost:5000';
const GEOJSON_BACKEND_URL = process.env.REACT_APP_GEOJSON_URL ?? 'http://localhost:5000';

export { BACKEND_URL, GEOJSON_BACKEND_URL };
