-- PostGIS adds map/location types and queries (used by Place.location later).
-- The Docker image already has it; staging and production databases may not.
CREATE EXTENSION IF NOT EXISTS postgis;
