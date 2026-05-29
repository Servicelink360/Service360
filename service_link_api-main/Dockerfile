FROM node:18-bookworm-slim AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:18-bookworm-slim
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --legacy-peer-deps --omit=dev
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/public ./public
EXPOSE 5301
CMD ["npm", "run", "start:prod"]
