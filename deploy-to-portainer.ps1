# PowerShell script to deploy Harmony Health Django system to Portainer
# Usage: .\deploy-to-portainer.ps1 -ApiKey "YOUR_NEW_TOKEN" -EndpointId 5

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,
    
    [Parameter(Mandatory=$true)]
    [int]$EndpointId,
    
    [string]$PortainerUrl = "https://portainer.fmtagency.online",
    [string]$ComposePath = "C:\Users\ayand\OneDrive - asdevelopers\Documents\GitHub\Harmony-System-Django\docker-compose.prod.yml",
    [string]$StackName = "harmony-django-prod"
)

try {
    # Read the docker-compose file content
    $ComposeContent = Get-Content $ComposePath -Raw
    
    # Prepare the request body
    $Body = @{
        Name = $StackName
        StackFileContent = $ComposeContent
        Env = @()
    } | ConvertTo-Json -Depth 50
    
    # API endpoint for creating stack
    $Uri = "$PortainerUrl/api/stacks/create/standalone/string?endpointId=$EndpointId"
    
    Write-Host "Deploying stack '$StackName' to Portainer..."
    
    # Make the API call to create the stack
    $Response = Invoke-RestMethod `
        -Method Post `
        -Uri $Uri `
        -Headers @{ "X-API-Key" = $ApiKey } `
        -ContentType "application/json" `
        -Body $Body
    
    Write-Host "Stack deployment response:"
    $Response | ConvertTo-Json -Depth 50
    
    Write-Host "Stack '$StackName' deployed successfully!"
    
    # Verify the stack was created
    Write-Host "Verifying stack creation..."
    $Stacks = Invoke-RestMethod `
        -Uri "$PortainerUrl/api/stacks" `
        -Headers @{ "X-API-Key" = $ApiKey }
    
    $CreatedStack = $Stacks | Where-Object { $_.Name -eq $StackName } | Select-Object -First 1
    
    if ($CreatedStack) {
        Write-Host "Stack verification successful:"
        $CreatedStack | Select-Object Id, Name, EndpointId, Type, Status | Format-List
    } else {
        Write-Warning "Could not verify stack creation. Please check Portainer UI."
    }
    
    # Verify containers are running
    Write-Host "Checking container status..."
    $Containers = Invoke-RestMethod `
        -Uri "$PortainerUrl/api/endpoints/$EndpointId/docker/containers/json?all=true" `
        -Headers @{ "X-API-Key" = $ApiKey }
    
    $StackContainers = $Containers | Where-Object {
        $_.Labels."com.docker.compose.project" -eq $StackName -or
        $_.Names -like "*harmony-django*"
    } | Select-Object Id, Names, Image, State, Status
    
    if ($StackContainers) {
        Write-Host "Containers for stack '$StackName':"
        $StackContainers | Format-Table -AutoSize
    } else {
        Write-Warning "No containers found for stack '$StackName'."
    }
    
} catch {
    if ($_.Exception.Response) {
        Write-Host "StatusCode:" $_.Exception.Response.StatusCode.value__
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "ResponseBody:" $responseBody
    } else {
        Write-Host "Error: $($_.Exception.Message)"
        Write-Host "Stack trace: $($_.ScriptStackTrace)"
    }
    throw
}