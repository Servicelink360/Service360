FROM node:18-bookworm-slim AS build
WORKDIR /app

# CKEditor custom build (not committed in git)
COPY ckeditor5/package.json ./ckeditor5/
WORKDIR /app/ckeditor5
RUN npm install
COPY ckeditor5/ ./
RUN npm run build

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .

ARG REACT_APP_ORDER_API_URL=http://3.106.200.185:5301/
ARG REACT_APP_MODE=PROD
ENV REACT_APP_ORDER_API_URL=$REACT_APP_ORDER_API_URL
ENV REACT_APP_MODE=$REACT_APP_MODE
ENV NODE_OPTIONS=--openssl-legacy-provider --max_old_space_size=6144
ENV GENERATE_SOURCEMAP=false
ENV CI=false
ENV DISABLE_ESLINT_PLUGIN=true

RUN npm run build

FROM nginx:alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
