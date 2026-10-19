@echo off
rem Coloca o site no ar so para quem esta no Wi-Fi de casa.
rem Na primeira vez, o Windows pede permissao de administrador para liberar a porta 8080 apenas para a rede local.
cd /d "%~dp0"
netsh advfirewall firewall show rule name=VotoAVoto_RedeDeCasa >nul 2>&1
if errorlevel 1 (
  echo Liberando a porta 8080 so para a rede local. Clique em "Sim" na janela do Windows.
  powershell -NoProfile -Command "Start-Process netsh -Verb RunAs -Wait -ArgumentList 'advfirewall firewall add rule name=VotoAVoto_RedeDeCasa dir=in action=allow protocol=TCP localport=8080 remoteip=localsubnet profile=any'"
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0rede\servidor_rede.ps1"
pause
