
# ==========================================
# Stage 1: Build & Dependency Installation
# ==========================================
FROM node:20-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package management files first to leverage Docker caching
COPY package*.json ./

# Install all dependencies (including devDependencies if needed for building)
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Optional: If you use TypeScript or a bundler, uncomment the build line below
# RUN npm run build

# ==========================================
# Stage 2: Final Lightweight Runtime
# ==========================================
FROM node:20-alpine AS runner

# Set environment to production
ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies to keep the image small
RUN npm ci --only=production

# Copy the application source code from the builder stage
# (If you built a 'dist' or 'build' folder in Stage 1, copy that instead)
COPY --from=builder /app/src ./src

# Expose the port your backend service runs on (e.g., 5000, 8080)
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
