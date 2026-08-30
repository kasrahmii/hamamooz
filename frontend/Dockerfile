# Build stage
FROM node:20-alpine AS builder

ARG VITE_API_BASE_URL=http://127.0.0.1:8000

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Production stage
FROM nginx:alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]