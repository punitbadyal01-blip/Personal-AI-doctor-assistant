FROM node:24-alpine
WORKDIR /app/backend
COPY backend/server.mjs backend/cloud.mjs ./
COPY dist/languages.js /app/dist/languages.js
COPY package.json /app/package.json
ENV HOST=0.0.0.0 PORT=8080
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
