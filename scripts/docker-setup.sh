#!/bin/bash
# Script to set up and start the Docker environment

# Ensure we're in the project root
cd "$(dirname "$0")/.."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed or not in PATH"
    exit 1
fi

# Check if .env file exists, if not create from example
if [ ! -f .env ]; then
    if [ -f .env.docker ]; then
        echo "Creating .env file from .env.docker template..."
        cp .env.docker .env
        echo "Please edit the .env file with your LND connection details before proceeding."
        exit 0
    else
        echo "Error: Neither .env nor .env.docker files found."
        exit 1
    fi
fi

# Ask if user wants to rebuild from scratch
read -p "Do you want to start fresh (remove all containers and volumes)? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Removing all containers and volumes..."
    docker-compose down -v
fi

# Build and start the containers
echo "Starting Docker containers..."
docker-compose up -d --build

# Wait for the app to be ready
echo "Waiting for the application to start..."
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null; then
        echo "Application is up and running!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "Application failed to start within the expected time. Check logs with: docker-compose logs -f app"
    fi
    echo -n "."
    sleep 1
done

echo "========================================================"
echo "Setup complete! The application is running at:"
echo "http://localhost:3000"
echo ""
echo "To view logs, run: docker-compose logs -f"
echo "To stop the services, run: docker-compose down"
echo "========================================================" 