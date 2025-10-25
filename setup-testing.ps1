Write-Host "Setting up Uber Clone Backend for Testing..." -ForegroundColor Green

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "Docker is running" -ForegroundColor Green
} catch {
    Write-Host "Docker is not running. Please start Docker first." -ForegroundColor Red
    exit 1
}

Write-Host "Starting Docker services..." -ForegroundColor Yellow
npm run docker:up

Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "Running database migrations..." -ForegroundColor Yellow
npm run prisma:migrate

Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npm run prisma:generate

Write-Host "Starting development server..." -ForegroundColor Yellow
Write-Host "Setup complete! Your API is ready for testing." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Import the Postman collection: Uber_Clone_API.postman_collection.json" -ForegroundColor White
Write-Host "2. Import the environment: Uber_Clone_Environment.postman_environment.json" -ForegroundColor White
Write-Host "3. Start testing with the Authentication endpoints first" -ForegroundColor White
Write-Host ""
Write-Host "API Base URL: http://localhost:3000/api" -ForegroundColor Magenta
Write-Host "Adminer (Database UI): http://localhost:8080" -ForegroundColor Magenta
Write-Host "WebSocket: ws://localhost:3000" -ForegroundColor Magenta
Write-Host ""
Write-Host "Check POSTMAN_TESTING_GUIDE.md for detailed testing instructions" -ForegroundColor Cyan
