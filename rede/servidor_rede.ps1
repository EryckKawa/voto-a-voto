# Voto a voto: coloca o site no ar só para a rede de casa (quem está no mesmo Wi-Fi).
# Não instala nada: usa o próprio Windows. Para desligar, feche esta janela (ou aperte Ctrl+C).
# Segurança:
#  - só responde a endereços de rede local (192.168.x.x, 10.x.x.x, 172.16-31.x.x e o próprio computador);
#  - só entrega arquivos de dentro da pasta do site, e só para leitura (GET/HEAD);
#  - o roteador de casa não deixa ninguém de fora chegar até aqui, a não ser que alguém abra a porta nele.
param([int]$Porta = 8080)
$ErrorActionPreference = 'Stop'
$Raiz = [System.IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..'))
if (-not $Raiz.EndsWith('\')) { $Raiz += '\' }

$Tipos = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'application/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'
  '.jpeg' = 'image/jpeg'; '.webp' = 'image/webp'; '.ico' = 'image/x-icon'; '.woff2' = 'font/woff2'; '.woff' = 'font/woff'
  '.ttf' = 'font/ttf'; '.txt' = 'text/plain; charset=utf-8'; '.csv' = 'text/csv; charset=utf-8'
}
# pastas que não precisam aparecer na rede
$Bloqueadas = @('scripts\', 'rede\', 'testes\')

function EhRedeLocal([System.Net.IPAddress]$ip) {
  if ($ip.IsIPv4MappedToIPv6) { $ip = $ip.MapToIPv4() }
  if ([System.Net.IPAddress]::IsLoopback($ip)) { return $true }
  $b = $ip.GetAddressBytes()
  if ($b.Length -ne 4) { return $false }
  return ($b[0] -eq 10) -or ($b[0] -eq 192 -and $b[1] -eq 168) -or ($b[0] -eq 172 -and $b[1] -ge 16 -and $b[1] -le 31)
}

function Responde($fluxo, [int]$codigo, [string]$texto, [string]$tipo, [long]$tamanho, [bool]$soCabecalho) {
  $cab = "HTTP/1.1 $codigo $texto`r`nContent-Type: $tipo`r`nContent-Length: $tamanho`r`nCache-Control: no-cache`r`nX-Content-Type-Options: nosniff`r`nConnection: close`r`n`r`n"
  $bytes = [System.Text.Encoding]::ASCII.GetBytes($cab)
  $fluxo.Write($bytes, 0, $bytes.Length)
}
function RespondeTexto($fluxo, [int]$codigo, [string]$texto, [string]$corpo) {
  $b = [System.Text.Encoding]::UTF8.GetBytes($corpo)
  Responde $fluxo $codigo $texto 'text/plain; charset=utf-8' $b.Length $false
  $fluxo.Write($b, 0, $b.Length)
}

# endereços deste computador na rede de casa
$ips = @()
try {
  $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
    Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and (EhRedeLocal ([System.Net.IPAddress]::Parse($_.IPAddress))) } |
    Select-Object -ExpandProperty IPAddress
} catch {
  $ips = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | Where-Object { $_.AddressFamily -eq 'InterNetwork' -and (EhRedeLocal $_) -and -not [System.Net.IPAddress]::IsLoopback($_) } | ForEach-Object { $_.ToString() }
}

$escuta = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $Porta)
try { $escuta.Start() } catch {
  Write-Host ""
  Write-Host "A porta $Porta já está em uso. Feche a outra janela do site (ou reinicie o computador) e tente de novo." -ForegroundColor Red
  exit 1
}

Clear-Host
Write-Host ""
Write-Host "  VOTO A VOTO está no ar na rede de casa" -ForegroundColor Green
Write-Host ""
Write-Host "  Neste computador:   http://localhost:$Porta"
foreach ($ip in $ips) { Write-Host "  No celular ou em outro computador do mesmo Wi-Fi:   http://${ip}:$Porta" -ForegroundColor Yellow }
if (-not $ips) { Write-Host "  Não achei o endereço deste computador na rede. Veja se o Wi-Fi está ligado." -ForegroundColor Red }
Write-Host ""
Write-Host "  Só aparelhos da rede de casa conseguem abrir. Para desligar, feche esta janela."
Write-Host "  Dica: não clique dentro desta janela (o Windows pausa o programa enquanto há texto selecionado)."
Write-Host ""

$vistos = @{}
try {
  while ($true) {
    $cli = $escuta.AcceptTcpClient()
    try {
      $cli.ReceiveTimeout = 5000; $cli.SendTimeout = 20000; $cli.NoDelay = $true
      $remoto = $cli.Client.RemoteEndPoint.Address
      $fluxo = $cli.GetStream()
      if (-not (EhRedeLocal $remoto)) { RespondeTexto $fluxo 403 'Forbidden' 'Este site só abre na rede de casa.'; continue }
      $leitor = New-Object System.IO.StreamReader($fluxo, [System.Text.Encoding]::ASCII, $false, 8192, $true)
      $linha = $leitor.ReadLine()
      if (-not $linha) { continue }
      while ($true) { $h = $leitor.ReadLine(); if ($h -eq $null -or $h -eq '') { break } }
      $partes = $linha.Split(' ')
      if ($partes.Length -lt 2) { continue }
      $metodo = $partes[0]; $alvo = $partes[1]
      if ($metodo -ne 'GET' -and $metodo -ne 'HEAD') { RespondeTexto $fluxo 405 'Method Not Allowed' 'Só leitura.'; continue }
      $caminho = [System.Uri]::UnescapeDataString(($alvo -split '[?#]')[0])
      if ($caminho -eq '/' -or $caminho -eq '') { $caminho = '/index.html' }
      $rel = $caminho.TrimStart('/').Replace('/', '\')
      $arquivo = [System.IO.Path]::GetFullPath((Join-Path $Raiz $rel))
      $dentro = $arquivo.StartsWith($Raiz, [System.StringComparison]::OrdinalIgnoreCase)
      $bloq = $Bloqueadas | Where-Object { $rel.StartsWith($_, [System.StringComparison]::OrdinalIgnoreCase) }
      if (-not $dentro -or $bloq -or -not [System.IO.File]::Exists($arquivo)) { RespondeTexto $fluxo 404 'Not Found' 'Não encontrado.'; continue }
      $ext = [System.IO.Path]::GetExtension($arquivo).ToLower()
      $tipo = $Tipos[$ext]; if (-not $tipo) { $tipo = 'application/octet-stream' }
      $fs = [System.IO.File]::OpenRead($arquivo)
      try {
        Responde $fluxo 200 'OK' $tipo $fs.Length ($metodo -eq 'HEAD')
        if ($metodo -eq 'GET') { $fs.CopyTo($fluxo, 65536) }
      } finally { $fs.Dispose() }
      $quem = $remoto.ToString()
      if (-not $vistos.ContainsKey($quem)) { $vistos[$quem] = 1; Write-Host ("  " + (Get-Date -Format 'HH:mm') + "  um aparelho abriu o site: " + $quem) }
    } catch {
      # aparelho que desistiu no meio do envio: segue para o próximo
    } finally {
      $cli.Close()
    }
  }
} finally {
  $escuta.Stop()
}
