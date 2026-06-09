$ApiKey = $env:HARMONY_PORTAINER_API_KEY
$Headers = @{ "X-API-Key" = $ApiKey }
$BaseUri = "https://portainer.fmtagency.online/api/endpoints/5/docker"

try {
    $Info = Invoke-RestMethod -Uri "$BaseUri/containers/harmony-django-backend/json" -Headers $Headers -Method Get
    
    [PSCustomObject]@{
        Name = $Info.Name
        Image = $Info.Config.Image
        Env = $Info.Config.Env
        ExposedPorts = $Info.Config.ExposedPorts
        PortBindings = $Info.HostConfig.PortBindings | ConvertTo-Json -Depth 10
        RestartPolicy = $Info.HostConfig.RestartPolicy
        NetworkMode = $Info.HostConfig.NetworkMode
        Binds = $Info.HostConfig.Binds
        Networks = $Info.NetworkSettings.Networks | ConvertTo-Json -Depth 10
    } | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Failed: $($_.Exception.Message)"
}
