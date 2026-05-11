$ErrorActionPreference = 'Stop'
$proc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npm','run','dev' -WorkingDirectory (Get-Location) -PassThru -RedirectStandardOutput 'dev.log' -RedirectStandardError 'dev.err.log' -WindowStyle Hidden
try {
  Start-Sleep -Seconds 20
  $urls = @('http://localhost:3000/','http://localhost:3000/products','http://localhost:3000/products/netflix-premium','http://localhost:3000/c/ai','http://localhost:3000/c/hiburan','http://localhost:3000/login')
  foreach ($url in $urls) {
    try {
      $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 25
      Write-Host ("{0} = {1}" -f $url, $resp.StatusCode)
    } catch {
      $code = 'ERR'
      if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
      Write-Host ("{0} = {1}" -f $url, $code)
    }
  }
}
finally {
  try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {}
  Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}
