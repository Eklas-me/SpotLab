# Build Stage
FROM node:22-alpine AS build

WORKDIR /app

# Copy package.json and install all dependencies (including devDependencies)
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Production Stage (Serve static files with Nginx)
FROM nginx:alpine

# Copy built files from the previous stage to Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
