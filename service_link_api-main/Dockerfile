FROM node:20-bookworm-slim AS build
WORKDIR /usr/src/app
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install --legacy-peer-deps --omit=dev
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/public ./public
COPY --from=build /usr/src/app/template.html ./template.html
COPY deploy/global-bundle.pem ./deploy/global-bundle.pem
EXPOSE 5301
CMD ["npm", "run", "start:prod"]
