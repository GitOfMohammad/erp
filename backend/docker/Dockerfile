FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS development
ENV NODE_ENV=development
COPY --chown=node:node . .
RUN mkdir -p uploads/images uploads/files logs && chown -R node:node uploads logs
USER node
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev

FROM node:24-bookworm-slim AS production
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node app.js server.js ./
COPY --chown=node:node core ./core
COPY --chown=node:node modules ./modules
RUN mkdir -p uploads/images uploads/files logs && chown -R node:node uploads logs
USER node
EXPOSE 3000
CMD ["node", "server.js"]
