# Stage 1: Build the React SPA
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build-time argument for API URL (needed to embed it into static frontend assets at build time)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the production bundle
RUN npm run build

# Stage 2: Serve the build directory with Nginx
FROM nginx:alpine

# Copy the built files from Stage 1 to Nginx public folder
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the custom nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
