try {
    Write-Host "Executing research run b575cdd8..."
    $r = Invoke-RestMethod 'http://localhost:5000/api/v1/research-runs/b575cdd8-eea1-49e0-acc4-4348af6d11bb/execute' -Method Post -TimeoutSec 300
    Write-Host "SUCCESS! Status: $($r.status)"
    Write-Host "Run status: $($r.data.status)"
    Write-Host "Report title: $($r.data.report.title)"
    Write-Host "Claims count: $($r.data.claims.Count)"
} catch {
    $msg = $_.Exception.Message
    Write-Host "FAILED: $msg"
    try {
        $body = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Error detail: $($body | ConvertTo-Json -Depth 3)"
    } catch {}
}
