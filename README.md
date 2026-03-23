# Keep in Trip - Frontend Portal

This is the frontend portal for the **Keep in Trip** senior project. It is built using **Next.js** and containerized with Docker for seamless development and deployment.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Installation & Configuration

1. **Clone the repository** (if you haven't already) and navigate to the project directory:
   ```bash
   cd 499-senior-project-trip-portal
   ```

2. **Environment Variables**:
   Copy the example environment file and configure your local variables before building the application:
   ```bash
   cp .env.example .env
   ```

## Build and Run (using Docker)

The project includes a `docker-compose.yml` file that builds the Next.js application and serves it via Docker.

1. **Build and start the application**:
   ```bash
   docker-compose up --build
   ```
   *(To run the container in the background, append `-d` to the command).*

2. **Access the Portal**:
   Once the build completes and the container is running, open [http://localhost:3000](http://localhost:3000) with your browser to explore the portal.

## Stopping the Application

To stop the running application if it's in detached mode, run:
```bash
docker-compose down
```
If it's running in the foreground, simply press `Ctrl+C` in your terminal.
