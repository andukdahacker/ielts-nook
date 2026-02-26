#!/bin/bash

# E2E Test Runner Script
# This script starts all required services and runs E2E tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FIREBASE_PROJECT_ID="claite-87848"
FIREBASE_AUTH_EMULATOR_PORT=9099
BACKEND_PORT=4000
WEBAPP_PORT=5173
INNGEST_PORT=8288
DATABASE_URL="${DATABASE_URL:-postgresql://user:password@localhost:5432/classlite}"

# Export env vars for child processes
export NODE_ENV="development"
export FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:${FIREBASE_AUTH_EMULATOR_PORT}"
export VITE_USE_FIREBASE_EMULATOR="true"
export DATABASE_URL
# Disable real email sending during E2E tests — backend jobs skip when empty.
# Use export (not unset) so dotenv won't re-populate from .env files.
export RESEND_API_KEY=""

# PIDs for cleanup
FIREBASE_PID=""
BACKEND_PID=""
INNGEST_PID=""
WEBAPP_PID=""

cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"

    if [ -n "$WEBAPP_PID" ]; then
        echo "Stopping webapp (PID: $WEBAPP_PID)"
        kill $WEBAPP_PID 2>/dev/null || true
    fi

    if [ -n "$INNGEST_PID" ]; then
        echo "Stopping Inngest Dev Server (PID: $INNGEST_PID)"
        kill $INNGEST_PID 2>/dev/null || true
    fi

    if [ -n "$BACKEND_PID" ]; then
        echo "Stopping backend (PID: $BACKEND_PID)"
        kill $BACKEND_PID 2>/dev/null || true
    fi

    if [ -n "$FIREBASE_PID" ]; then
        echo "Stopping Firebase emulator (PID: $FIREBASE_PID)"
        kill $FIREBASE_PID 2>/dev/null || true
    fi

    # Kill any remaining processes on the ports
    lsof -ti:$FIREBASE_AUTH_EMULATOR_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti:$INNGEST_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti:$WEBAPP_PORT | xargs kill -9 2>/dev/null || true

    echo -e "${GREEN}Cleanup complete${NC}"
}

# Set up trap for cleanup on exit
trap cleanup EXIT INT TERM

# Clear any existing processes on the ports before starting
echo -e "${YELLOW}Clearing existing processes on ports...${NC}"
lsof -ti:$FIREBASE_AUTH_EMULATOR_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$INNGEST_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$WEBAPP_PORT | xargs kill -9 2>/dev/null || true
sleep 1

wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=${3:-30}
    local attempt=1

    echo -n "Waiting for $name"
    while [ $attempt -le $max_attempts ]; do
        # Use curl - any HTTP response means the server is up
        http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
        if [ "$http_code" != "000" ]; then
            echo -e " ${GREEN}ready${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done

    echo -e " ${RED}timeout${NC}"
    return 1
}

wait_for_port() {
    local port=$1
    local name=$2
    local max_attempts=${3:-30}
    local attempt=1

    echo -n "Waiting for $name on port $port"
    while [ $attempt -le $max_attempts ]; do
        # Check both IPv4 and IPv6, also use lsof as fallback
        if nc -z localhost $port 2>/dev/null || lsof -i:$port -sTCP:LISTEN >/dev/null 2>&1; then
            echo -e " ${GREEN}ready${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo -e " ${RED}timeout${NC}"
    return 1
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   E2E Test Runner${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Configuration:"
echo "  DATABASE_URL: $DATABASE_URL"
echo "  FIREBASE_AUTH_EMULATOR_HOST: $FIREBASE_AUTH_EMULATOR_HOST"
echo ""

# Step 1: Start Firebase Auth Emulator
echo -e "${YELLOW}Step 1: Starting Firebase Auth Emulator...${NC}"
firebase emulators:start --only auth --project $FIREBASE_PROJECT_ID > /tmp/firebase-emulator.log 2>&1 &
FIREBASE_PID=$!

if ! wait_for_port $FIREBASE_AUTH_EMULATOR_PORT "Firebase Auth Emulator" 30; then
    echo -e "${RED}Failed to start Firebase emulator${NC}"
    cat /tmp/firebase-emulator.log
    exit 1
fi

# Step 2: Start Backend
echo -e "${YELLOW}Step 2: Starting Backend...${NC}"
pnpm --filter backend dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

if ! wait_for_port $BACKEND_PORT "Backend" 60; then
    echo -e "${RED}Failed to start backend${NC}"
    cat /tmp/backend.log
    exit 1
fi

# Step 3: Start Inngest Dev Server (required for background jobs like CSV import)
echo -e "${YELLOW}Step 3: Starting Inngest Dev Server...${NC}"
npx inngest-cli dev --no-discovery -u "http://localhost:${BACKEND_PORT}/api/inngest" -p $INNGEST_PORT > /tmp/inngest-dev.log 2>&1 &
INNGEST_PID=$!

if ! wait_for_port $INNGEST_PORT "Inngest Dev Server" 30; then
    echo -e "${RED}Failed to start Inngest Dev Server${NC}"
    cat /tmp/inngest-dev.log
    exit 1
fi

# Step 4: Start Webapp
echo -e "${YELLOW}Step 4: Starting Webapp...${NC}"
pnpm --filter webapp dev > /tmp/webapp.log 2>&1 &
WEBAPP_PID=$!

# Use HTTP check for Vite dev server (more reliable than port check)
if ! wait_for_service "http://localhost:$WEBAPP_PORT" "Webapp" 60; then
    echo -e "${RED}Failed to start webapp${NC}"
    cat /tmp/webapp.log
    exit 1
fi

# Step 5: Seed test data
echo -e "${YELLOW}Step 5: Seeding test data...${NC}"
if ! pnpm -w run test:e2e:seed; then
    echo -e "${RED}Failed to seed test data${NC}"
    exit 1
fi
echo -e "${GREEN}Test data seeded successfully${NC}"

# Step 6: Run E2E tests
echo ""
echo -e "${YELLOW}Step 6: Running E2E tests...${NC}"
echo -e "${BLUE}========================================${NC}"

# Run tests (pass any additional arguments to playwright)
pnpm -w run test:e2e:chromium "$@"
TEST_EXIT_CODE=$?

echo ""
echo -e "${BLUE}========================================${NC}"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}E2E tests passed!${NC}"
else
    echo -e "${RED}E2E tests failed (exit code: $TEST_EXIT_CODE)${NC}"
fi
echo -e "${BLUE}========================================${NC}"

exit $TEST_EXIT_CODE
