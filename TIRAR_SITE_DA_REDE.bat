@echo off
rem Fecha a porta 8080 que o LIGAR_SITE_NA_REDE abriu (pede permissao de administrador).
powershell -NoProfile -Command "Start-Process netsh -Verb RunAs -Wait -ArgumentList 'advfirewall firewall delete rule name=VotoAVoto_RedeDeCasa'"
echo Pronto. A porta 8080 esta fechada de novo. Para tirar o site do ar agora, feche a janela do servidor.
pause
