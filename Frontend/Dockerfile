FROM nginx:latest

ARG NGINX_PORT
ENV NGINX_PORT=${NGINX_PORT}

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY src /usr/share/nginx/html

EXPOSE ${NGINX_PORT}