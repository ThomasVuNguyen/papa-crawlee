FROM apify/actor-node:22 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --include=dev --audit=false
COPY . ./
RUN npm run build

FROM apify/actor-node:22
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm --quiet set progress=false && npm install --omit=dev && echo "Installed" && node --version
COPY . ./
EXPOSE 3000
CMD ["npm", "start"]
