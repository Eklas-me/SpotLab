# Build Stage (Frontend)
FROM node:22-alpine AS build

WORKDIR /app

# Copy package.json and install frontend dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build frontend
COPY . .
RUN npm run build

# Production Stage (Backend + Frontend)
FROM node:22-alpine

WORKDIR /app

# Copy backend files
COPY server/package*.json ./
RUN npm install --omit=dev

COPY server/ ./

# Create public directory and copy frontend build
RUN mkdir -p public
COPY --from=build /app/dist ./public/

# Expose backend port
EXPOSE 5000

CMD ["npm", "start"]
