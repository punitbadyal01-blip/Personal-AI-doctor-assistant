FROM node:24-alpine
WORKDIR /app
COPY server.mjs ./server.mjs
ENV HOST=0.0.0.0 PORT=8080
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
