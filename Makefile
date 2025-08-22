.PHONY: help dev prod build-dev build-prod up-dev up-prod down logs clean

# Default target
help:
	@echo "Available commands:"
	@echo "  dev        - Start development environment"
	@echo "  prod       - Start production environment"
	@echo "  build-dev  - Build development images"
	@echo "  build-prod - Build production images"
	@echo "  down       - Stop all containers"
	@echo "  logs       - Show logs"
	@echo "  clean      - Remove all containers and images"

# Development environment
dev: build-dev up-dev

build-dev:
	@echo "Building development images..."
	@docker-compose -f docker-compose.dev.yml build

up-dev:
	@echo "Starting development environment..."
	@docker-compose -f docker-compose.dev.yml up -d
	@echo "Development environment started!"
	@echo "Frontend: http://localhost:5173"
	@echo "API: http://localhost:5000"
	@echo "Flower: http://localhost:5555"
	@echo "PgAdmin: http://localhost:8080"

# Production environment
prod: build-prod up-prod

build-prod:
	@echo "Building production images..."
	@docker-compose build

up-prod:
	@echo "Starting production environment..."
	@docker-compose up -d
	@echo "Production environment started!"
	@echo "Frontend: http://localhost"
	@echo "API: http://localhost:5000"
	@echo "Flower: http://localhost:5555"
	@echo "PgAdmin: http://localhost:8080"

# Stop containers
down:
	@echo "Stopping containers..."
	@docker-compose down 2>/dev/null || true
	@docker-compose -f docker-compose.dev.yml down 2>/dev/null || true

# Show logs
logs:
	@docker-compose logs -f

logs-dev:
	@docker-compose -f docker-compose.dev.yml logs -f

# Clean up
clean: down
	@echo "Cleaning up containers and images..."
	@docker system prune -f
	@docker volume prune -f
