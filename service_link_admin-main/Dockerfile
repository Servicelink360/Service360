FROM node:18-bookworm-slim AS build
ARG REACT_APP_ORDER_API_URL=http://13.55.122.55:5301/
ARG REACT_APP_MODE=PROD

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

# CRA reads .env.production at build time. Write it here so the API URL cannot
# come from stale copied .env files or from a cached layer with the wrong ARG.
RUN printf 'REACT_APP_ORDER_API_URL=%s\nREACT_APP_MODE=%s\nGENERATE_SOURCEMAP=false\n' \
    "$REACT_APP_ORDER_API_URL" "$REACT_APP_MODE" > .env.production

ENV NODE_OPTIONS=--openssl-legacy-provider --max_old_space_size=3072
ENV CI=false
ENV DISABLE_ESLINT_PLUGIN=true

RUN npm run build

FROM nginx:alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
