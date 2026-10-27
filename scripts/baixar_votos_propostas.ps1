# Voto a voto - baixa o que a ficha do politico e as nuvens de palavras usam, alem do que baixar_brasil.ps1 ja traz:
#   - Camara dos Deputados: o voto de cada deputado em cada votacao do Plenario (votacoesVotos, 2019-2026) e a lista de deputados
#   - TSE: planos de governo (PDF) dos candidatos a governador (2018, 2022, 2026) e a prefeito (2020, 2024) dos 27 estados
# Uso: powershell -ExecutionPolicy Bypass -File baixar_votos_propostas.ps1 [camara] [governador] [prefeito]
$ErrorActionPreference = 'Continue'
$raiz = Join-Path $env:USERPROFILE 'Downloads\BDR_Votacao'
$partes = if ($args.Count) { $args } else { @('camara', 'governador', 'prefeito') }
$UFS = 'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'

function Baixa($url, $dest, $log) {
  if (Test-Path $dest) { return }
  $l = "$(Get-Date -Format 'HH:mm:ss') BAIXANDO $(Split-Path $dest -Leaf)"; Add-Content -Path $log -Value $l -Encoding utf8; Write-Host $l
  & curl.exe -sS -f -L --retry 5 --retry-delay 5 -o "$dest.parcial" $url
  if ($LASTEXITCODE -eq 0) { Move-Item "$dest.parcial" $dest; Add-Content -Path $log -Value "  OK $([math]::Round((Get-Item $dest).Length/1MB,1)) MB" -Encoding utf8 }
  else { Remove-Item "$dest.parcial" -ErrorAction SilentlyContinue; Add-Content -Path $log -Value "  FALHOU (curl $LASTEXITCODE) $url" -Encoding utf8 }
}

if ('camara' -in $partes) {
  $dir = Join-Path $raiz 'camara'; New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $log = Join-Path $dir 'log_camara.txt'
  foreach ($a in 2019..2026) { Baixa "https://dadosabertos.camara.leg.br/arquivos/votacoesVotos/csv/votacoesVotos-$a.csv" (Join-Path $dir "votacoesVotos-$a.csv") $log }
  Baixa 'https://dadosabertos.camara.leg.br/arquivos/deputados/csv/deputados.csv' (Join-Path $dir 'deputados.csv') $log
}

$cdn = 'https://cdn.tse.jus.br/estatistica/sead/odsele/proposta_governo'
$dir = Join-Path $raiz 'propostas'; New-Item -ItemType Directory -Force -Path $dir | Out-Null
$log = Join-Path $dir 'log_propostas.txt'
if ('governador' -in $partes) { foreach ($ano in 2018, 2022, 2026) { foreach ($uf in $UFS) { Baixa "$cdn/proposta_governo_${ano}_${uf}.zip" (Join-Path $dir "proposta_governo_${ano}_${uf}.zip") $log } } }
if ('prefeito' -in $partes) { foreach ($ano in 2020, 2024) { foreach ($uf in ($UFS | Where-Object { $_ -ne 'DF' })) { Baixa "$cdn/proposta_governo_${ano}_${uf}.zip" (Join-Path $dir "proposta_governo_${ano}_${uf}.zip") $log } } }
Write-Host 'FIM'
