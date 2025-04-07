FROM node:18-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npm run generate

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Default command (will be overridden by docker-compose)
CMD ["npm", "start"] 