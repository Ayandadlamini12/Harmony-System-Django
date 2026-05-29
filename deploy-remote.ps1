# PowerShell script to deploy Harmony Health Django system to remote Portainer
# Usage: .\deploy-remote.ps1 -ApiKey "YOUR_PORTAINER_TOKEN" -EndpointId 5

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,
    
    [Parameter(Mandatory=$true)]
    [int]$EndpointId,
    
    [string]$PortainerUrl = "https://portainer.fmtagency.online",
    [string]$StackFilePath = "C:\Users\ayand\OneDrive - asdevelopers\Documents\GitHub\Harmony-System-Django\remote-deployment-stack.yml",
    [string]$StackName = "harmony-health-django"
)

Write-Host "Starting deployment of Harmony Health Django system..."

try {
    # Check if stack file exists
    if (-not (Test-Path $StackFilePath)) {
        throw "Stack file not found: $StackFilePath"
    }
    
    # Read the stack file content
    Write-Host "Reading stack file: $StackFilePath"
    $StackContent = Get-Content $StackFilePath -Raw
    
    # Prepare environment variables
    # Note: In a production environment, you should securely manage these secrets
    $EnvVars = @(
        @{ name = "DB_DATABASE"; value = "harmony" },
        @{ name = "DB_USERNAME"; value = "harmony" },
        @{ name = "DB_PASSWORD"; value = "harmony123" },  # Change this in production
        @{ name = "DJANGO_SECRET_KEY"; value = "django-insecure-key-change-in-production" },  # Change this in production
        @{ name = "HARMONY_WEBHOOK_SECRET"; value = "webhook-secret-change-in-production" },  # Change this in production
        @{ name = "APP_URL"; value = "https://harmony-health.yourdomain.com" },  # Change this to your domain
        @{ name = "TUNNEL_TOKEN"; value = "your-cloudflare-tunnel-token" }  # Change this to your Cloudflare tunnel token
    )
    
    # Prepare the request body
    $Body = @{
        Name = $StackName
        StackFileContent = $StackContent
        Env = $EnvVars
    } | ConvertTo-Json -Depth 50
    
    Write-Host "Preparing to deploy stack '$StackName'..."
    
    # API endpoint for creating stack
    $Uri = "$PortainerUrl/api/stacks/create/standalone/string?endpointId=$EndpointId"
    
    # Make the API call to create the stack
    Write-Host "Sending deployment request to Portainer..."
    $Response = Invoke-RestMethod `
        -Method Post `
        -Uri $Uri `
        -Headers @{ "X-API-Key" = $ApiKey } `
        -ContentType "application/json" `
        -Body $Body
    
    Write-Host "SUCCESS: Stack deployed successfully!" -ForegroundColor Green
    Write-Host "Stack ID: $($Response.Id)"
    Write-Host "Stack Name: $($Response.Name)"
    
    # Verify the stack was created
    Write-Host "Verifying stack creation..."
    $Stacks = Invoke-RestMethod `
        -Uri "$PortainerUrl/api/stacks" `
        -Headers @{ "X-API-Key" = $ApiKey }
    
    $CreatedStack = $Stacks | Where-Object { $_.Name -eq $StackName } | Select-Object -First 1
    
    if ($CreatedStack) {
        Write-Host "Verification successful:" -ForegroundColor Green
        Write-Host "  Stack ID: $($CreatedStack.Id)"
        Write-Host "  Stack Name: $($CreatedStack.Name)"
        Write-Host "  Status: $($CreatedStack.Status)"
    } else {
        Write-Warning "Could not verify stack creation. Please check Portainer UI."
    }
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Check container status in Portainer UI"
    Write-Host "2. Run database migrations if needed:"
    Write-Host "   docker exec harmony-django-backend python manage.py migrate"
    Write-Host "3. Create a superuser if needed:"
    Write-Host "   docker exec harmony-django-backend python manage.py createsuperuser"
    Write-Host "4. Configure your Cloudflare tunnel to point to the frontend container"
    
} catch {
    Write-Host "ERROR: Deployment failed" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "StatusCode: $($_.Exception.Response.StatusCode.value__)"
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "ResponseBody: $responseBody"
        } catch {
            Write-Host "Could not read response body: $($_.Exception.Message)"
        }
    } else {
        Write-Host "Error: $($_.Exception.Message)"
        Write-Host "Stack trace: $($_.ScriptStackTrace)"
    }
    exit 1
}