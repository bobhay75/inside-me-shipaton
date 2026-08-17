FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY index.js ./
ENV PORT=8080
CMD ["node", "index.js"]
