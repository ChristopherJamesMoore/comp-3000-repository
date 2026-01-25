# Use an official Node.js runtime as a parent image
FROM node:20-alpine
RUN apk add curl

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install any needed packages
RUN npm install

# Bundle app source
COPY . .

# Copy the entrypoint script
COPY entrypoint.sh .

# Make the entrypoint script executable
RUN chmod +x ./entrypoint.sh

# Make port 3001 available to the world outside this container
EXPOSE 3001

# Set the entrypoint
ENTRYPOINT ["./entrypoint.sh"]
