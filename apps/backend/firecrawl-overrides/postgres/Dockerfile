# Custom PostgreSQL 17 with pg_cron extension
# Extends Firecrawl's PostgreSQL setup with pg_cron support
# Uses Debian-based image (same as Firecrawl) for proper pg_cron compatibility

ARG PG_MAJOR=17
FROM postgres:${PG_MAJOR}

# Install pg_cron extension for PostgreSQL 17
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        postgresql-${PG_MAJOR}-cron; \
    rm -rf /var/lib/apt/lists/*

# Pre-configure pg_cron in postgresql.conf.sample (BEFORE first startup)
# This is critical - shared_preload_libraries must be set before PostgreSQL initializes
RUN set -eux; \
    conf_sample="/usr/share/postgresql/${PG_MAJOR}/postgresql.conf.sample"; \
    sed -ri "s/^#?shared_preload_libraries\s*=.*/shared_preload_libraries = 'pg_cron'/" "$conf_sample"; \
    printf "\n# Added for pg_cron\ncron.database_name = 'firecrawl'\n" >> "$conf_sample"

# Copy initialization scripts
# 000-enable-pg_cron.sql runs first to create the extension
# 001-nuq.sql runs second (copied from Firecrawl submodule)
COPY init-scripts/*.sql /docker-entrypoint-initdb.d/

# Ensure scripts are executable
RUN chmod 644 /docker-entrypoint-initdb.d/*.sql
