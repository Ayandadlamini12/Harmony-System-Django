# Harmony Health Redeploy via Portainer API
# Updates stack definition and rebuilds

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,
    
    [string]$PortainerUrl = "https://portainer.fmtagency.online",
    [int]$EndpointId = 5,
    [int]$StackId = 69
)

$RequiredKeycloakEnv = @(
    "KEYCLOAK_ENABLED",
    "KEYCLOAK_SERVER_URL",
    "KEYCLOAK_REALM",
    "KEYCLOAK_CLIENT_ID",
    "KEYCLOAK_CLIENT_SECRET",
    "KEYCLOAK_ALLOW_LOCAL_FALLBACK",
    "KEYCLOAK_ADMIN_USERNAME",
    "KEYCLOAK_ADMIN_PASSWORD",
    "KEYCLOAK_ACTION_EMAIL_LIFESPAN"
)

$RequiredZulipEnv = @(
    "ZULIP_SITE",
    "ZULIP_BOT_EMAIL",
    "ZULIP_BOT_API_KEY",
    "ZULIP_BOT_TIMEOUT",
    "ZULIP_RETRY_LIMIT",
    "ZULIP_RETRY_BATCH_SIZE",
    "ZULIP_RETRY_WINDOW_MINUTES"
)

function Convert-EnvListToMap {
    param([object[]]$EnvList)
    $Map = @{}
    foreach ($Item in ($EnvList | Where-Object { $_ })) {
        if ($Item -is [string]) {
            $Parts = $Item -split "=", 2
            if ($Parts.Length -eq 2) {
                $Map[$Parts[0]] = $Parts[1]
            }
        } elseif ($Item.name) {
            $Map[$Item.name] = $Item.value
        }
    }
    return $Map
}

function Convert-EnvMapToList {
    param([hashtable]$EnvMap)
    return $EnvMap.Keys | Sort-Object | ForEach-Object {
        @{
            name = $_
            value = [string]$EnvMap[$_]
        }
    }
}

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

    Write-Host "Step 2b: Reading current backend container env for Keycloak settings..." -ForegroundColor Yellow
    $BackendInspectUri = "$PortainerUrl/api/endpoints/$EndpointId/docker/containers/harmony-django-backend/json"
    $BackendInspect = Invoke-RestMethod `
        -Uri $BackendInspectUri `
        -Headers @{ "X-API-Key" = $ApiKey } `
        -Method Get

    $StackEnvMap = Convert-EnvListToMap $StackResponse.Env
    $BackendEnvMap = Convert-EnvListToMap $BackendInspect.Config.Env

    foreach ($Key in $RequiredKeycloakEnv) {
        $StackValue = if ($StackEnvMap.ContainsKey($Key)) { [string]$StackEnvMap[$Key] } else { "" }
        $BackendValue = if ($BackendEnvMap.ContainsKey($Key)) { [string]$BackendEnvMap[$Key] } else { "" }

        if ([string]::IsNullOrWhiteSpace($StackValue) -and -not [string]::IsNullOrWhiteSpace($BackendValue)) {
            $StackEnvMap[$Key] = $BackendValue
            Write-Host "Preserving live backend value for $Key" -ForegroundColor Green
        }
    }

    foreach ($Key in $RequiredZulipEnv) {
        $StackValue = if ($StackEnvMap.ContainsKey($Key)) { [string]$StackEnvMap[$Key] } else { "" }
        $BackendValue = if ($BackendEnvMap.ContainsKey($Key)) { [string]$BackendEnvMap[$Key] } else { "" }

        if ([string]::IsNullOrWhiteSpace($StackValue) -and -not [string]::IsNullOrWhiteSpace($BackendValue)) {
            $StackEnvMap[$Key] = $BackendValue
            Write-Host "Preserving live backend value for $Key" -ForegroundColor Green
        }
    }

    $MissingKeycloak = @(
        $RequiredKeycloakEnv | Where-Object {
            -not $StackEnvMap.ContainsKey($_) -or [string]::IsNullOrWhiteSpace([string]$StackEnvMap[$_])
        }
    )

    if ($MissingKeycloak.Count -gt 0) {
        Write-Host "WARNING: These Keycloak env vars are still missing and may break identity on redeploy:" -ForegroundColor Yellow
        $MissingKeycloak | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
    }

    $MissingZulip = @(
        $RequiredZulipEnv | Where-Object {
            -not $StackEnvMap.ContainsKey($_) -or [string]::IsNullOrWhiteSpace([string]$StackEnvMap[$_])
        }
    )

    if ($MissingZulip.Count -gt 0) {
        Write-Host "WARNING: These Zulip env vars are still missing and may break coordination on redeploy:" -ForegroundColor Yellow
        $MissingZulip | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
    }
    
    Write-Host "Step 3: Sending update/rebuild request..." -ForegroundColor Yellow
    
    $UpdateUri = "$PortainerUrl/api/stacks/$StackId`?endpointId=$EndpointId"
    
    $UpdateBody = @{
        StackFileContent = $FileResponse.StackFileContent
        Env = Convert-EnvMapToList $StackEnvMap
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
