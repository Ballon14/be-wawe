FROM node:18-alpine

# Set work directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of your code
COPY . .

# Set environment variable jika ingin (opsional)
# ENV NODE_ENV=production

# Expose port (ubah jika tidak 3000)
EXPOSE 3000

# Jalankan aplikasi
CMD ["node", "server.js"]