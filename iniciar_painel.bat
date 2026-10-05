@echo off
chcp 65001 > nul
echo ============================================================
echo   URE SOROCABA - Controle de Emprestimos de Equipamentos
echo ============================================================
echo.
echo Iniciando o painel no navegador padrao...
start "" "%~dp0index.html"
echo.
echo Painel aberto com sucesso!
timeout /t 3 > nul
exit
