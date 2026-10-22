# Voto a voto - fotos oficiais dos candidatos (TSE), em miniatura, para o site.
# Lê fotos_lista.csv (ano;uf;sq_foto;sq_site), baixa o pacote de fotos de cada estado e ano do Portal de Dados Abertos do TSE,
# tira só as fotos da lista, reduz para 90x120 e grava em voto-a-voto\img\fotos\<ano>\<sq_site>.jpg. O pacote é apagado depois.
# Pode fechar e rodar de novo: ele pula os pacotes já feitos.
$ErrorActionPreference = 'Continue'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.IO.Compression.FileSystem
$aqui  = Split-Path -Parent $MyInvocation.MyCommand.Path
$site  = Join-Path $env:USERPROFILE 'Documents\UFPI\BDR\Trabalho_Votacao\voto-a-voto'
$saida = Join-Path $site 'img\fotos'
$tmp   = Join-Path $aqui 'fotos\_baixando'
$feito = Join-Path $aqui 'fotos\_feito'
$log   = Join-Path $aqui 'fotos\log_fotos_site.txt'
$man   = Join-Path $aqui 'fotos\fotos_ok.csv'
New-Item -ItemType Directory -Force -Path $saida, $tmp, $feito | Out-Null
function Log($m) { $l = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $m"; Add-Content -Path $log -Value $l -Encoding utf8; Write-Host $l }

# lista: (ano, uf) -> { sq_foto -> sq_site }
$pac = @{}
foreach ($l in (Get-Content (Join-Path $aqui 'fotos_lista.csv') | Select-Object -Skip 1)) {
  $c = $l.Split(';'); if ($c.Count -lt 4) { continue }
  $k = $c[0] + '_' + $c[1]
  if (-not $pac.ContainsKey($k)) { $pac[$k] = @{} }
  $pac[$k][$c[2]] = $c[3]
}
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$par = New-Object System.Drawing.Imaging.EncoderParameters(1)
$par.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]72)
$W = 90; $H = 120

function Miniatura($stream, $destino) {
  $img = [System.Drawing.Image]::FromStream($stream)
  try {
    # recorte no centro com a proporção 3:4, depois reduz
    $r = $W / $H; $sw = $img.Width; $sh = $img.Height
    if ($sw / $sh -gt $r) { $cw = [int]($sh * $r); $ch = $sh; $cx = [int](($sw - $cw) / 2); $cy = 0 }
    else { $cw = $sw; $ch = [int]($sw / $r); $cx = 0; $cy = [int](($sh - $ch) / 4) }   # um pouco acima do centro: o rosto
    $bmp = New-Object System.Drawing.Bitmap($W, $H)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $W, $H)), (New-Object System.Drawing.Rectangle($cx, $cy, $cw, $ch)), [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose(); $bmp.Save($destino, $codec, $par); $bmp.Dispose()
  } finally { $img.Dispose() }
}

$chaves = $pac.Keys | Sort-Object
Log "INICIO - $($chaves.Count) pacotes, $(($pac.Values | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum) fotos"
$n = 0
foreach ($k in $chaves) {
  $n++; $ano, $uf = $k.Split('_'); $ok = Join-Path $feito "$k.ok"
  if (Test-Path $ok) { continue }
  $zip = Join-Path $tmp "foto_cand${ano}_${uf}_div.zip"
  $url = "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes$ano/fotos/foto_cand${ano}_${uf}_div.zip"
  $deu = $false
  for ($t = 1; $t -le 3 -and -not $deu; $t++) {
    Log "[$n/$($chaves.Count)] BAIXANDO $ano $uf (tentativa $t)"
    & curl.exe -sS -f -L --retry 5 --retry-delay 10 -C - -o $zip $url
    if ($LASTEXITCODE -eq 0) { $deu = $true } elseif ($LASTEXITCODE -eq 22) { Log "  nao existe: $url"; break } else { Start-Sleep -Seconds 15 }
  }
  if (-not $deu) { Log "SEM PACOTE $ano $uf"; continue }
  $quer = $pac[$k]; $dir = Join-Path $saida $ano; New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $feitas = 0; $erros = 0
  try {
    $z = [System.IO.Compression.ZipFile]::OpenRead($zip)
    foreach ($e in $z.Entries) {
      if ($e.Name -notmatch '(\d{6,})') { continue }
      $sq = $Matches[1]; if (-not $quer.ContainsKey($sq)) { continue }
      $dest = Join-Path $dir ($quer[$sq] + '.jpg')
      try { $s = $e.Open(); try { Miniatura $s $dest } finally { $s.Dispose() }; $feitas++; Add-Content -Path $man -Value "$ano;$($quer[$sq])" }
      catch { $erros++ }
    }
    $z.Dispose()
  } catch { Log "  erro ao abrir o pacote: $($_.Exception.Message)"; Remove-Item $zip -ErrorAction SilentlyContinue; continue }
  Remove-Item $zip -ErrorAction SilentlyContinue
  Set-Content -Path $ok -Value "fotos=$feitas de $($quer.Count) erros=$erros"
  Log "PRONTO $ano $uf  $feitas de $($quer.Count) fotos"
}
# um zip com as miniaturas, para conferir e publicar
$pronto = Join-Path $aqui 'fotos\fotos_site.zip'
Remove-Item $pronto -ErrorAction SilentlyContinue
[System.IO.Compression.ZipFile]::CreateFromDirectory($saida, $pronto)
Log "FIM - $((Get-Content $man -ErrorAction SilentlyContinue | Sort-Object -Unique).Count) fotos no site; pacote em $pronto"
