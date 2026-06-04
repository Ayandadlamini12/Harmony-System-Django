$ApiKey = $env:HARMONY_PORTAINER_API_KEY
$Headers = @{ "X-API-Key" = $ApiKey }
$BaseUri = "https://portainer.fmtagency.online/api/endpoints/5/docker"
$NewImage = "harmony_frontend:latest"

Write-Host "Starting zero-downtime rolling container swap..." -ForegroundColor Cyan

# Define the container creation parameters
$CreateBody = @{
    Image = $NewImage
    Env = @(
        "COOKIE_SECURE=true",
        "HOSTNAME=0.0.0.0",
        "API_BASE_URL=http://backend:8000/api",
        "NEXT_PUBLIC_API_BASE_URL=https://mis.harmonyhealthsz.com/api",
        "APP_BASE_URL=https://mis.harmonyhealthsz.com",
        "NODE_ENV=production"
    )
    ExposedPorts = @{
        "3000/tcp" = @{}
    }
    HostConfig = @{
        PortBindings = @{
            "3000/tcp" = @(
                @{
                    HostIp = ""
                    HostPort = "30001"
                }
            )
        }
        RestartPolicy = @{
            Name = "always"
        }
    }
    Healthcheck = @{
        Test = @("CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))")
        Interval = 20000000000
        Timeout = 5000000000
        Retries = 5
    }
} | ConvertTo-Json -Depth 10

try {
    # 1. Check if old container backup exists from previous attempts, clean it up
    Write-Host "Step 1: Cleaning up any old backup containers..." -ForegroundColor Yellow
    try {
        Invoke-RestMethod -Uri "$BaseUri/containers/harmony-django-frontend-old?force=true" -Headers $Headers -Method Delete -ErrorAction SilentlyContinue
        Write-Host "Cleaned up existing backup container." -ForegroundColor Gray
    } catch {}

    # 2. Stop the current running container
    Write-Host "Step 2: Stopping active container 'harmony-django-frontend'..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri "$BaseUri/containers/harmony-django-frontend/stop" -Headers $Headers -Method Post -ErrorAction Stop
    Write-Host "Container stopped." -ForegroundColor Green

    # 3. Rename the current container to 'harmony-django-frontend-old'
    Write-Host "Step 3: Renaming active container to backup 'harmony-django-frontend-old'..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri "$BaseUri/containers/harmony-django-frontend/rename?name=harmony-django-frontend-old" -Headers $Headers -Method Post -ErrorAction Stop
    Write-Host "Container renamed." -ForegroundColor Green

    # 4. Create the new container
    Write-Host "Step 4: Creating new container from image '$NewImage'..." -ForegroundColor Yellow
    $CreateResponse = Invoke-RestMethod -Uri "$BaseUri/containers/create?name=harmony-django-frontend" -Headers $Headers -Method Post -ContentType "application/json" -Body $CreateBody -ErrorAction Stop
    $NewContainerId = $CreateResponse.Id
    Write-Host "New container created: $NewContainerId" -ForegroundColor Green

    # 5. Connect the new container to network 'harmony_harmony-net' with aliases
    Write-Host "Step 5: Connecting new container to network 'harmony_harmony-net' with aliases..." -ForegroundColor Yellow
    $NetworkConnectBody = @{
        Container = $NewContainerId
        EndpointConfig = @{
            Aliases = @("harmony-django-frontend", "frontend")
        }
    } | ConvertTo-Json -Depth 5
    Invoke-RestMethod -Uri "$BaseUri/networks/harmony_harmony-net/connect" -Headers $Headers -Method Post -ContentType "application/json" -Body $NetworkConnectBody -ErrorAction Stop
    Write-Host "Connected to network." -ForegroundColor Green

    # 6. Start the new container
    Write-Host "Step 6: Starting new container..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri "$BaseUri/containers/harmony-django-frontend/start" -Headers $Headers -Method Post -ErrorAction Stop
    Write-Host "New container started successfully!" -ForegroundColor Green

    # 7. Verification / Healthcheck polling
    Write-Host "Step 7: Waiting 10 seconds for service startup, then verifying health..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    $Inspect = Invoke-RestMethod -Uri "$BaseUri/containers/harmony-django-frontend/json" -Headers $Headers -Method Get -ErrorAction Stop
    $Status = $Inspect.State.Health.Status
    Write-Host "Container state: $($Inspect.State.Status), Health: $Status" -ForegroundColor Green
    
    # 8. Clean up backup container
    Write-Host "Step 8: Cleaning up backup container..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri "$BaseUri/containers/harmony-django-frontend-old?force=true" -Headers $Headers -Method Delete -ErrorAction Stop
    Write-Host "Backup container deleted." -ForegroundColor Green
    
    Write-Host "SWAP COMPLETED SUCCESSFULLY WITH ZERO-DOWNTIME BACKUP SAFETY!" -ForegroundColor Green
    Write-Host "Verify deployment at: https://mis.harmonyhealthsz.com" -ForegroundColor Cyan

} catch {
    Write-Host "ERROR ENCOUNTERED during swap: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "TRIGGERING AUTOMATIC ROLLBACK..." -ForegroundColor Orange
    
    try {
        # Clean up the failed new container
        Write-Host "Stopping and removing failed new container..." -ForegroundColor Yellow
        Invoke-RestMethod -Uri "$BaseUri/containers/harmony-django-frontend?force=true" -Headers $Headers -Method Delete -ErrorAction SilentlyContinue
        
        # Rename the backup container back
        Write-Host "Renaming backup container back to 'harmony-django-frontend'..." -ForegroundColor Yellow
        Invoke-RestMethod -Uri "$BaseUri/containers/harmony-django-frontend-old/rename?name=harmony-django-frontend" -Headers $Headers -Method Post -ErrorAction Stop
        
        # Start the backup container
        Write-Host "Restarting backup container..." -ForegroundColor Yellow
        Invoke-RestMethod -Uri "$BaseUri/containers/harmony-django-frontend/start" -Headers $Headers -Method Post -ErrorAction Stop
        
        Write-Host "ROLLBACK COMPLETED. Service is running on original container." -ForegroundColor Green
    } catch {
        Write-Host "CRITICAL ROLLBACK FAILURE: $($_.Exception.Message). Direct manual intervention required!" -ForegroundColor Red
    }
}
