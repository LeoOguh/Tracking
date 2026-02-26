@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================
::   DEPLOY AUTOMÁTICO - GitHub Pages
::   Projeto: Tracking
:: ============================================

set "PROJETO=C:\Users\Leonardo\Documents\GitHub\Tracking"
set "DOWNLOADS=%USERPROFILE%\Downloads"
set "VERSOES=C:\Users\Leonardo\Downloads\versões"
set "TEMP_EXTRACT=%TEMP%\tracking_deploy"

echo.
echo ============================================
echo      DEPLOY AUTOMATICO - TRACKING
echo ============================================
echo.

:: ── 1. Pede mensagem de commit ──────────────
set /p MENSAGEM="Mensagem do commit: "
if "%MENSAGEM%"=="" set "MENSAGEM=update: alteracoes realizadas"

echo.
echo --------------------------------------------
echo Procurando arquivo ZIP em Downloads...
echo --------------------------------------------
echo.

:: ── 2. Encontra o ZIP mais recente ──────────
set "ZIP_ENCONTRADO="

for /f "delims=" %%F in ('dir /b /o-d "%DOWNLOADS%\*.zip" 2^>nul') do (
    if "!ZIP_ENCONTRADO!"=="" (
        set "ZIP_ENCONTRADO=%DOWNLOADS%\%%F"
        echo   Encontrado: %%F
    )
)

if "!ZIP_ENCONTRADO!"=="" (
    echo   ERRO: Nenhum arquivo .zip encontrado em Downloads!
    echo   Baixe o ZIP gerado pelo Claude e tente novamente.
    echo.
    pause
    exit /b 1
)

echo.
set /p CONFIRMA="   Usar este arquivo? (S/N): "
if /i "!CONFIRMA!"=="N" (
    echo.
    set /p ZIP_ENCONTRADO="Cole o caminho completo do ZIP: "
)

echo.
echo --------------------------------------------
echo Extraindo ZIP...
echo --------------------------------------------
echo.

:: ── 3. Extrai ZIP ───────────────────────────
if exist "%TEMP_EXTRACT%" rmdir /s /q "%TEMP_EXTRACT%"
mkdir "%TEMP_EXTRACT%"

powershell -command "Expand-Archive -Path '!ZIP_ENCONTRADO!' -DestinationPath '%TEMP_EXTRACT%' -Force"

if errorlevel 1 (
    echo   ERRO ao extrair o ZIP!
    pause
    exit /b 1
)

echo   Extraido com sucesso!
echo.

:: ── 4. Copia arquivos para o projeto ────────
echo --------------------------------------------
echo Copiando arquivos para o projeto...
echo --------------------------------------------
echo.

set COUNT=0

for /r "%TEMP_EXTRACT%" %%F in (*.html *.css *.js *.json *.png *.jpg *.svg *.txt) do (
    echo %%F | findstr /i "\.git" >nul
    if errorlevel 1 (
        set "ARQUIVO_FULL=%%F"
        set "REL_PATH=!ARQUIVO_FULL:%TEMP_EXTRACT%\=!"

        for /f "tokens=1* delims=\" %%A in ("!REL_PATH!") do (
            if "%%B"=="" (
                copy /Y "%%F" "%PROJETO%\%%~nxF" >nul
                echo   OK: %%~nxF
            ) else (
                set "REL_PATH=%%B"
                for %%D in ("%PROJETO%\!REL_PATH!") do (
                    if not exist "%%~dpD" mkdir "%%~dpD"
                )
                copy /Y "%%F" "%PROJETO%\!REL_PATH!" >nul
                echo   OK: !REL_PATH!
            )
        )
        set /a COUNT+=1
    )
)

if !COUNT!==0 (
    echo   AVISO: Nenhum arquivo copiado. Verifique o conteudo do ZIP.
    pause
    exit /b 1
)

echo.
echo   Total: !COUNT! arquivo(s) copiado(s)
echo.

:: ── 5. Git ──────────────────────────────────
cd /d "%PROJETO%"

echo --------------------------------------------
echo Executando Git...
echo --------------------------------------------
echo.

git add .
git status --short
echo.
git commit -m "%MENSAGEM%"

echo.
echo --------------------------------------------
echo Enviando para o GitHub Pages...
echo --------------------------------------------
echo.

git push

echo.
echo ============================================
echo   DEPLOY CONCLUIDO COM SUCESSO!
echo ============================================
echo.

:: ── 6. Move ZIP para pasta versões ──────────
if not exist "%VERSOES%" mkdir "%VERSOES%"

move /Y "!ZIP_ENCONTRADO!" "%VERSOES%\" >nul

if errorlevel 1 (
    echo   AVISO: Nao foi possivel mover o ZIP para versoes.
) else (
    for %%F in ("!ZIP_ENCONTRADO!") do echo   ZIP movido para versoes: %%~nxF
)

rmdir /s /q "%TEMP_EXTRACT%"

echo.
pause
