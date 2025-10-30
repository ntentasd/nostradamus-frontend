FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/build ./build
COPY package*.json .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "build"]