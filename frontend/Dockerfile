# ── build stage ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# VITE_API_URL must be baked in at build time
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── serve stage ───────────────────────────────────────────────────────────
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
