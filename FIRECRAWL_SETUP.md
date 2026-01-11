# Firecrawl Local Development Setup

This guide explains how to run Firecrawl locally for development with My Social Agents.

## Quick Start

### 1. Copy Environment File

```bash
# Backend environment (includes Firecrawl configuration)
cd apps/backend
cp .env.example .env
```

### 2. Start All Services

```bash
# From apps/backend directory
docker-compose up -d

# Check service status
docker-compose ps
```

### 3. Verify Firecrawl is Running

```bash
# Run verification script (from project root)
./scripts/verify-firecrawl.sh

# Or manually check health
curl http://localhost:3002/health
```

### 4. Test Scraping

```bash
# Test basic scrape
curl -X POST http://localhost:3002/v2/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "formats": ["markdown"]}'
```

## Services Overview

The `docker-compose.yml` starts the following services:

| Service                | Port  | Description                   |
| ---------------------- | ----- | ----------------------------- |
| `postgres`             | 5433  | Backend PostgreSQL database   |
| `pgadmin`              | 5050  | PostgreSQL admin UI           |
| `firecrawl-api`        | 3002  | Firecrawl API server          |
| `firecrawl-playwright` | -     | Browser automation (internal) |
| `firecrawl-redis`      | -     | Job queue (internal)          |
| `firecrawl-rabbitmq`   | 15672 | Message queue + Management UI |
| `firecrawl-postgres`   | -     | Firecrawl database (internal) |

## Accessing Services

### Firecrawl API

- **URL**: http://localhost:3002
- **Health**: http://localhost:3002/health
- **Admin Panel**: http://localhost:3002/admin/dev-admin-key/queues

### Backend PostgreSQL

- **Host**: localhost
- **Port**: 5433
- **User**: postgres
- **Password**: postgres
- **Database**: crypto_knowledge

### pgAdmin

- **URL**: http://localhost:5050
- **Email**: admin@example.com
- **Password**: admin

### RabbitMQ Management

- **URL**: http://localhost:15672
- **User**: guest
- **Password**: guest

## Development Workflow

### Start Services

```bash
# From apps/backend directory
cd apps/backend

# Start all services in background
docker-compose up -d

# Start with logs visible
docker-compose up
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f firecrawl-api
docker-compose logs -f postgres
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart firecrawl-api
```

## Running the Backend

Once Firecrawl is running, start the NestJS backend:

```bash
# From apps/backend directory
cd apps/backend

# Install dependencies (first time only)
npm install

# Start development server
npm run start:dev
```

The backend will connect to Firecrawl at `http://localhost:3002`.

## Troubleshooting

### Firecrawl API Not Starting

**Check logs**:

```bash
cd apps/backend
docker-compose logs firecrawl-api
```

**Common issues**:

- Redis not ready: Wait for Redis health check to pass
- PostgreSQL not ready: Wait for PostgreSQL health check to pass
- Port conflict: Ensure port 3002 is not in use

### Port Conflicts

If you get port conflicts, edit `apps/backend/.env`:

1. **PostgreSQL (5433)**: Already configured to avoid conflicts
2. **Firecrawl (3002)**: Change `FIRECRAWL_PORT=3002` to another port
3. **pgAdmin (5050)**: Change port mapping in `docker-compose.yml`

### Redis Connection Errors

```bash
# Check Redis is running
cd apps/backend
docker-compose ps firecrawl-redis

# Test Redis connection
docker-compose exec firecrawl-redis redis-cli ping
```

### Playwright Issues

```bash
# Check Playwright logs
cd apps/backend
docker-compose logs firecrawl-playwright

# Restart Playwright service
docker-compose restart firecrawl-playwright
```

### Database Connection Issues

**Backend can't connect to PostgreSQL**:

- Verify `DB_PORT=5433` in `apps/backend/.env`
- Check PostgreSQL is running: `docker-compose ps postgres`

**Firecrawl can't connect to its PostgreSQL**:

- Check logs: `docker-compose logs firecrawl-postgres`
- Verify credentials match in `.env`

## Performance Tuning

### Resource Limits

Edit `apps/backend/docker-compose.yml` to adjust resource limits:

```yaml
services:
  firecrawl-api:
    deploy:
      resources:
        limits:
          cpus: '4.0' # Adjust based on your system
          memory: 8G # Adjust based on your system
```

### Concurrent Requests

Edit `apps/backend/.env` to adjust concurrency:

```env
FIRECRAWL_NUM_WORKERS_PER_QUEUE=8
FIRECRAWL_CRAWL_CONCURRENT_REQUESTS=10
FIRECRAWL_MAX_CONCURRENT_JOBS=5
FIRECRAWL_BROWSER_POOL_SIZE=5
```

## Clean Up

### Remove All Containers and Volumes

```bash
cd apps/backend

# Stop and remove everything
docker-compose down -v

# Remove unused Docker resources
docker system prune -a
```

### Reset to Clean State

```bash
cd apps/backend

# Stop services
docker-compose down -v

# Remove environment file
rm .env

# Recreate from example
cp .env.example .env

# Start fresh
docker-compose up -d
```

## Next Steps

1. ✅ Firecrawl is running locally
2. ✅ Backend can connect to Firecrawl
3. 🔄 Implement Firecrawl adapter in backend (see Phase 3 of spec)
4. 🔄 Test scraping functionality
5. 🔄 Integrate with ingestion pipeline

## Related Documentation

- [Firecrawl Integration Spec](.kiro/specs/firecrawl-integration/)
- [Firecrawl Steering](.kiro/steering/70-firecrawl-integration.md)
- [Firecrawl Docker Setup](apps/firecrawl/.kiro/steering/20-docker-setup.md)
- [Firecrawl Environment Config](apps/firecrawl/.kiro/steering/21-environment-configuration.md)
