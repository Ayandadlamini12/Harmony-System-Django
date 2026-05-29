# Harmony Health Redeploy via Portainer API
# Updates stack definition and rebuilds

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,
    
    [string]$PortainerUrl = "https://portainer.fmtagency.online",
    [int]$EndpointId = 5,
    [int]$StackId = 69
)

Write-Host "Harmony Health Stack Redeploy" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "Step 1: Fetching current stack file..." -ForegroundColor Yellow
    $FileUri = "$PortainerUrl/api/stacks/$StackId/file"
    $FileResponse = Invoke-RestMethod `
        -Uri $FileUri `
        -Headers @{ "X-API-Key" = $ApiKey } `
        -Method Get
    
    Write-Host "Got stack file (version: $($FileResponse.StackFileVersion))" -ForegroundColor Green
    
    Write-Host "Step 2: Fetching current stack configuration..." -ForegroundColor Yellow
    $StackUri = "$PortainerUrl/api/stacks/$StackId"
    $StackResponse = Invoke-RestMethod `
        -Uri $StackUri `
        -Headers @{ "X-API-Key" = $ApiKey } `
        -Method Get
    
    Write-Host "Stack: $($StackResponse.Name)" -ForegroundColor Green
    
    Write-Host "Step 3: Sending update/rebuild request..." -ForegroundColor Yellow
    
    $UpdateUri = "$PortainerUrl/api/stacks/$StackId`?endpointId=$EndpointId"
    
    $UpdateBody = @{
        StackFileContent = $FileResponse.StackFileContent
        Env = $StackResponse.Env
    } | ConvertTo-Json -Depth 50
    
    $UpdateResponse = Invoke-RestMethod `
        -Uri $UpdateUri `
        -Headers @{ "X-API-Key" = $ApiKey } `
        -Method Put `
        -ContentType "application/json" `
        -Body $UpdateBody
    
    Write-Host "Stack updated successfully!" -ForegroundColor Green
    Write-Host "Containers are rebuilding..." -ForegroundColor Green
    Write-Host ""
    Write-Host "Verify at: https://mis.harmonyhealthsz.com" -ForegroundColor Yellow
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $StatusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "HTTP Status: $StatusCode" -ForegroundColor Gray
        if ($StatusCode -eq 400) {
            Write-Host "Hint: Check that Env variables are properly formatted" -ForegroundColor Gray
        }
    }
    exit 1
}
