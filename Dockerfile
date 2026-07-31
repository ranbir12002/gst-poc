# syntax=docker/dockerfile:1

# ---- Stage 1: build the React frontend ----
FROM node:20-alpine AS frontend-build
WORKDIR /app/map-selector

COPY map-selector/package*.json ./
RUN npm ci

COPY map-selector/ ./

# Frontend + backend are served from the same origin (via nginx), so leave
# these blank/relative unless you deploy the API on a different host.
# (Maps use maplibre-gl + plain OpenStreetMap tiles — no token required.)
ARG REACT_APP_BACKEND_URL=
ARG REACT_APP_GEOJSON_URL=
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL \
    REACT_APP_GEOJSON_URL=$REACT_APP_GEOJSON_URL

RUN npm run build

# ---- Stage 2: backend runtime, serving the built frontend as static files ----
FROM node:20-alpine AS backend
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./
# server.js resolves "../map-selector/build" relative to __dirname (/app/backend)
COPY --from=frontend-build /app/map-selector/build /app/map-selector/build

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "server.js"]
