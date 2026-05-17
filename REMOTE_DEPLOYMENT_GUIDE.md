# Remote Deployment Guide for Harmony Health Django System

## Overview
This guide explains how to deploy the Harmony Health Django system to your remote server using Portainer, ensuring it doesn't interfere with your existing CyberPanel installations.

## Prerequisites
1. Access to your Portainer instance at https://portainer.fmtagency.online
2. Valid Portainer API token
3. Cloudflare tunnel token for external access
4. Environment variables prepared

## Deployment Steps

### 1. Prepare Environment Variables
Create a `.env` file with the following variables:
```env
DB_DATABASE=harmony
DB_USERNAME=harmony
DB_PASSWORD=your_secure_database_password
DJANGO_SECRET_KEY=your_django_secret_key_here
HARMONY_WEBHOOK_SECRET=your_webhook_secret_here
APP_URL=https://your-domain.com
TUNNEL_TOKEN=your_cloudflare_tunnel_token
```

### 2. Create Stack in Portainer via Web Interface
1. Log into Portainer at https://portainer.fmtagency.online
2. Navigate to "Stacks" in the left menu
3. Click "Add stack"
4. Choose "Web editor" option
5. Name the stack "harmony-health-django"
6. Copy the content of `remote-deployment-stack.yml` into the editor
7. In the "Environment variables" section, add all the variables from your `.env` file
8. Click "Deploy the stack"

### 3. Alternative: Deploy via Portainer API
If you prefer to use the API, use this PowerShell script:

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,
    
    [Parameter(Mandatory=$true)]
    [int]$EndpointId,
    
    [string]$PortainerUrl = "https://portainer.fmtagency.online",
    [string]$StackName = "harmony-health-django"
)

# Read the stack file content
$StackContent = Get-Content "C:\Users\ayand\OneDrive - asdevelopers\Documents\GitHub\Harmony-System-Django\remote-deployment-stack.yml" -Raw

# Prepare environment variables
$EnvVars = @(
    @{ name = "DB_DATABASE"; value = "harmony" },
    @{ name = "DB_USERNAME"; value = "harmony" },
    @{ name = "DB_PASSWORD"; value = "your_secure_database_password" },
    @{ name = "DJANGO_SECRET_KEY"; value = "your_django_secret_key_here" },
    @{ name = "HARMONY_WEBHOOK_SECRET"; value = "your_webhook_secret_here" },
    @{ name = "APP_URL"; value = "https://your-domain.com" },
    @{ name = "TUNNEL_TOKEN"; value = "your_cloudflare_tunnel_token" }
)

# Prepare the request body
$Body = @{
    Name = $StackName
    StackFileContent = $StackContent
    Env = $EnvVars
} | ConvertTo-Json -Depth 50

# API endpoint for creating stack
$Uri = "$PortainerUrl/api/stacks/create/standalone/string?endpointId=$EndpointId"

try {
    # Make the API call to create the stack
    $Response = Invoke-RestMethod `
        -Method Post `
        -Uri $Uri `
        -Headers @{ "X-API-Key" = $ApiKey } `
        -ContentType "application/json" `
        -Body $Body
    
    Write-Host "Stack deployed successfully!"
    return $Response
} catch {
    if ($_.Exception.Response) {
        Write-Host "StatusCode:" $_.Exception.Response.StatusCode.value__
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "ResponseBody:" $responseBody
    } else {
        Write-Host "Error: $($_.Exception.Message)"
    }
    throw
}
```

### 4. Post-Deployment Configuration
After deployment, you may need to:

1. Run database migrations:
   ```bash
   docker exec harmony-django-backend python manage.py migrate
   ```

2. Create a superuser:
   ```bash
   docker exec harmony-django-backend python manage.py createsuperuser
   ```

3. Collect static files:
   ```bash
   docker exec harmony-django-backend python manage.py collectstatic --noinput
   ```

### 5. Verify Deployment
Check that all containers are running:
```bash
docker ps | grep harmony
```

Expected containers:
- harmony-django-db
- harmony-django-redis
- harmony-django-backend
- harmony-django-celery
- harmony-django-beat
- harmony-django-frontend
- cloudflared-harmony-django

### 6. Cloudflare Tunnel Configuration
Ensure your Cloudflare tunnel is configured to route traffic to the frontend container on port 3000.

### 7. Troubleshooting
If containers fail to start:

1. Check container logs:
   ```bash
   docker logs harmony-django-backend
   ```

2. Verify environment variables are correctly set in Portainer

3. Ensure the database password meets PostgreSQL requirements

4. Check that ports are not conflicting with existing CyberPanel services

## Important Notes
- This deployment uses standard ports (5432, 6379, 8000, 3000) which should not conflict with typical CyberPanel installations
- All containers are isolated in their own network (`harmony-net`)
- The Cloudflare tunnel container handles external access without exposing ports publicly
- Data is persisted in Docker volumes to survive container restarts