# Custom PostgreSQL image for Firecrawl with pg_cron support
# This extends the base PostgreSQL image without modifying the Firecrawl submodule

FROM postgres:17-alpine

# Install pg_cron extension
# Note: pg_cron is available in Alpine's community repository
RUN apk add --no-cache --repository=http://dl-cdn.alpinelinux.org/alpine/edge/community pg_cron

# Configure PostgreSQL to load pg_cron
# Set cron.database_name to 'firecrawl' so pg_cron works in the firecrawl database
RUN echo "shared_preload_libraries = 'pg_cron'" >> /usr/share/postgresql/postgresql.conf.sample && \
    echo "cron.database_name = 'firecrawl'" >> /usr/share/postgresql/postgresql.conf.sample

# Copy Firecrawl's original init scripts from the submodule
# These will be mounted via docker-compose volumes

# Note: Custom init scripts in init-scripts/ will be copied via docker-compose
# and will run AFTER Firecrawl's scripts (numbered 999-*)

