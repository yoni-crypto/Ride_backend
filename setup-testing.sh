#!/bin/bash

echo "🚀 Setting up Uber Clone Backend for Testing..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "📦 Starting Docker services..."
npm run docker:up

echo "⏳ Waiting for services to be ready..."
sleep 10

echo "🗄️ Running database migrations..."
npm run prisma:migrate

echo "🔧 Generating Prisma client..."
npm run prisma:generate

echo "🚀 Starting development server..."
echo "✅ Setup complete! Your API is ready for testing."
echo ""
echo "📋 Next steps:"
echo "1. Import the Postman collection: Uber_Clone_API.postman_collection.json"
echo "2. Import the environment: Uber_Clone_Environment.postman_environment.json"
echo "3. Start testing with the Authentication endpoints first"
echo ""
echo "🌐 API Base URL: http://localhost:3000/api"
echo "📊 Adminer (Database UI): http://localhost:8080"
echo "🔌 WebSocket: ws://localhost:3000"
echo ""
echo "📖 Check POSTMAN_TESTING_GUIDE.md for detailed testing instructions"
