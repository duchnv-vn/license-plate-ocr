FROM node:24-alpine AS build
WORKDIR /web
COPY apps/web/package*.json ./
RUN npm install --no-audit --no-fund
COPY apps/web/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /web/dist/platevision-web/browser /usr/share/nginx/html
RUN mkdir -p /tmp/nginx_body_temp && chown nginx:nginx /tmp/nginx_body_temp
EXPOSE 8080
