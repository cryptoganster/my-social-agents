# Custom Dockerfile for Firecrawl UI (ingestion-ui)
# Firecrawl doesn't provide a Dockerfile for the UI, so we create our own
# This allows us to run the UI in development mode with hot reload

FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Copy source code
# Note: The actual source will be mounted as a volume for hot reload
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run Vite dev server with host 0.0.0.0 to allow external connections
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
