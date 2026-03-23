FROM node:20-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy src code
COPY . .

# Build application
RUN npm run build

# Run image
FROM node:20-alpine

WORKDIR /app

# Copy built application and dependencies
COPY --from=builder /app ./

EXPOSE 3000

CMD ["npm", "start"]