# Voto a voto - dados que faltavam: bens declarados dos candidatos (TSE) e IDHM dos municipios (Atlas/PNUD via IpeaData)
# Pode fechar e rodar de novo: ele continua de onde parou.
$ErrorActionPreference = 'Continue'
$base   = Join-Path $env:USERPROFILE 'Downloads\BDR_Votacao\brasil'
$tmp    = Join-Path $base '_baixando'
$partes = Join-Path $base 'partes'
New-Item -ItemType Directory -Force -Path $tmp, $partes | Out-Null
$log = Join-Path $base 'log_extras.txt'
function Log($m) { $l = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $m"; Add-Content -Path $log -Value $l -Encoding utf8; Write-Host $l }
$cdn = 'https://cdn.tse.jus.br/estatistica/sead/odsele'
$ipea = 'http://www.ipeadata.gov.br/api/odata4'

$jobs = New-Object System.Collections.ArrayList
function Add-Job($nome, $ext, [string[]]$urls) { [void]$jobs.Add(@($nome, $ext, $urls)) }
foreach ($a in 2006,2008,2010,2012,2014,2016,2018,2020,2022,2024,2026) { Add-Job "bem_candidato_$a" 'zip' @("$cdn/bem_candidato/bem_candidato_$a.zip") }
# Atlas do Desenvolvimento Humano (PNUD/Ipea/FJP), Censos 1991, 2000 e 2010, por municipio
foreach ($s in 'ADH_IDHM','ADH_IDHM_E','ADH_IDHM_R','ADH_IDHM_L','ADH_T_SUPER25M','ADH_T_MED25M','ADH_T_FUND25M','ADH_E_ANOSESTUDO','ADH_T_ANALF25M','ADH_RDPC') {
  Add-Job "ipea_$s" 'json' @("$ipea/ValoresSerie(SERCODIGO='$s')")
}
Add-Job 'ipea_metadados_adh' 'json' @("$ipea/Metadados?`$filter=startswith(SERCODIGO,'ADH_')&`$select=SERCODIGO,SERNOME,SERNUMERICA")

function Cortar($arq, $nome, $ext) {
  $lim = 300MB; $buf = New-Object byte[] (8MB)
  $fs = [IO.File]::OpenRead($arq); $i = 0
  while ($fs.Position -lt $fs.Length) {
    $i++; $p = Join-Path $partes ('{0}.{1}.{2:D3}' -f $nome, $ext, $i)
    $o = [IO.File]::Create($p); $w = 0
    while ($w -lt $lim) { $n = $fs.Read($buf, 0, [Math]::Min($buf.Length, $lim - $w)); if ($n -le 0) { break }; $o.Write($buf, 0, $n); $w += $n }
    $o.Dispose()
  }
  $tam = $fs.Length; $fs.Dispose(); return @($i, $tam)
}

Log "INICIO extras - $($jobs.Count) arquivos"
$k = 0
foreach ($j in $jobs) {
  $k++; $nome = $j[0]; $ext = $j[1]; $ok = Join-Path $partes "$nome.ok"; $falhou = Join-Path $partes "$nome.nao_existe"
  if (Test-Path $ok) { continue }
  if (Test-Path $falhou) { continue }
  $arq = Join-Path $tmp "$nome.$ext"; $deu = $false
  foreach ($url in $j[2]) {
    for ($t = 1; $t -le 3 -and -not $deu; $t++) {
      Log "[$k/$($jobs.Count)] BAIXANDO $nome (tentativa $t) $url"
      if ($ext -eq 'zip') { & curl.exe -sS -f -L --retry 5 --retry-delay 10 -C - -o $arq $url }
      else { & curl.exe -sS -f -L --retry 5 --retry-delay 10 -H 'Accept: application/json' -o $arq $url }
      $rc = $LASTEXITCODE
      if ($rc -eq 0) { $deu = $true; break }
      if ($rc -eq 22) { Log "  nao existe neste endereco (curl 22)"; Remove-Item $arq -ErrorAction SilentlyContinue; break }
      Log "  falhou (curl $rc), tentando de novo"; Start-Sleep -Seconds 15
    }
    if ($deu) { break }
  }
  if (-not $deu) { Log "SEM ARQUIVO $nome"; Set-Content -Path $falhou -Value 'nao encontrado'; continue }
  $r = Cortar $arq $nome $ext
  Set-Content -Path $ok -Value "partes=$($r[0]) bytes=$($r[1])"
  Remove-Item $arq -ErrorAction SilentlyContinue
  Log "PRONTO $nome  $([math]::Round($r[1]/1MB,1)) MB em $($r[0]) parte(s)"
}
Log "FIM"
