@echo off
REM Equity Trading Platform - Automated Deploy & Run Script (Windows)
REM This script handles Docker container creation, updates, and launching

setlocal enabledelayedexpansion

REM Configuration
set CONTAINER_NAME=equity-server
set IMAGE_NAME=equity-server
set PORT=8080
set COMPOSE_FILE=docker-compose.yml
set WEB_URL=http://localhost:%PORT%
set VERSION_FILE=.version
set LOG_FILE=deploy.log

REM Initialize log
echo === Deploy started at %date% %time% === > %LOG_FILE%

echo.
echo 🚀 Equity Trading Platform - Auto Deploy Script
echo ==============================================
echo.

REM Check prerequisites
echo [INFO] Checking prerequisites...

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed. Please install Docker first.
    echo Visit: https://docs.docker.com/get-docker/
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed. Please install Docker Compose first.
    echo Visit: https://docs.docker.com/compose/install/
    pause
    exit /b 1
)

REM Check if Docker daemon is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker daemon is not running. Please start Docker first.
    pause
    exit /b 1
)

echo [SUCCESS] All prerequisites met

REM Get current version
set CURRENT_VERSION=0
if exist %VERSION_FILE% (
    set /p CURRENT_VERSION=<%VERSION_FILE%
)

echo [INFO] Current version: %CURRENT_VERSION%

REM Check if update is needed (simplified for Windows)
set NEEDS_UPDATE=true
if exist %VERSION_FILE% (
    REM Check if Dockerfile or source files are newer than version file
    for %%f in (Dockerfile docker-compose.yml cmd\*.go internal\*.go) do (
        if exist "%%f" (
            forfiles /m "%%f" /c "cmd /c if @fdate gtr %CURRENT_VERSION% echo NEWER" >nul 2>&1
            if not errorlevel 1 set NEEDS_UPDATE=true
        )
    )
)

if "%NEEDS_UPDATE%"=="true" (
    echo [INFO] 🔄 Update needed - rebuilding application...
    
    REM Stop existing containers
    echo [INFO] Stopping existing containers...
    docker-compose down --timeout 30
    
    REM Build and start
    echo [INFO] Building Docker images...
    docker-compose build --no-cache
    if errorlevel 1 (
        echo [ERROR] Failed to build images
        pause
        exit /b 1
    )
    
    echo [INFO] Starting services...
    docker-compose up -d
    if errorlevel 1 (
        echo [ERROR] Failed to start services
        pause
        exit /b 1
    )
    
    REM Update version file
    echo %date%_%time% > %VERSION_FILE%
    echo [SUCCESS] Version updated
    
) else (
    echo [INFO] ✅ Application is up to date
    
    REM Check if containers are running
    docker-compose ps | findstr "Up" >nul
    if errorlevel 1 (
        echo [INFO] 🔄 Starting existing application...
        docker-compose up -d
    ) else (
        echo [INFO] 🏃 Application is already running
    )
)

REM Wait for service to be ready
echo [INFO] Waiting for service to be ready...
set /a ATTEMPTS=0
set /a MAX_ATTEMPTS=30

:wait_loop
set /a ATTEMPTS+=1
if %ATTEMPTS% gtr %MAX_ATTEMPTS% (
    echo [ERROR] Service failed to start within expected time
    goto show_status
)

REM Check health endpoint
curl -s -f %WEB_URL%/health >nul 2>&1
if errorlevel 1 (
    echo [INFO] Attempt %ATTEMPTS%/%MAX_ATTEMPTS%: Service not ready yet, waiting 5 seconds...
    timeout /t 5 /nobreak >nul
    goto wait_loop
)

echo [SUCCESS] Service is ready!

:show_status
REM Show service status
echo.
echo === Container Status ===
docker-compose ps
echo.

REM Check service health
curl -s -f %WEB_URL%/health >nul 2>&1
if not errorlevel 1 (
    echo [SUCCESS] ✅ Service is healthy
    echo 🌐 Web interface: %WEB_URL%
    echo 📊 API endpoint: %WEB_URL%/api/v1
    echo 🔌 WebSocket: ws://localhost:%PORT%/api/v1/ws/stocks
    echo.
    
    REM Launch web browser
    echo [INFO] Launching web browser...
    timeout /t 2 /nobreak >nul
    start "" "%WEB_URL%"
    echo [SUCCESS] Web browser launched
    
) else (
    echo [ERROR] ❌ Service health check failed
    echo.
    echo 🔍 Troubleshooting:
    echo    • Check logs: docker-compose logs
    echo    • Check status: docker-compose ps
    echo    • Manual start: docker-compose up
)

REM Clean up old Docker resources
echo [INFO] Cleaning up old Docker resources...
for /f "tokens=*" %%i in ('docker images -f "dangling=true" -q 2^>nul') do docker rmi %%i >nul 2>&1
for /f "tokens=*" %%i in ('docker ps -a -f "status=exited" -q 2^>nul') do docker rm %%i >nul 2>&1
echo [SUCCESS] Cleanup completed

echo.
echo [SUCCESS] 🎉 Deployment completed successfully!
echo.
echo 📱 Application Details:
echo    • URL: %WEB_URL%
echo    • Version: 
type %VERSION_FILE% 2>nul
echo    • Logs: docker-compose logs -f
echo    • Stop: docker-compose down
echo.

echo Press any key to exit...
pause >nul