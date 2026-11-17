$currentDir = (Get-Location).Path
$wsh = New-Object -ComObject WScript.Shell

# 1. Crea il collegamento nella cartella principale
$rootShortcutPath = Join-Path $currentDir "LibrePDF.lnk"
$shortcutRoot = $wsh.CreateShortcut($rootShortcutPath)
$shortcutRoot.TargetPath = "wscript.exe"
$shortcutRoot.Arguments = "`"$currentDir\avvia-desktop.vbs`""
$shortcutRoot.WorkingDirectory = $currentDir
$shortcutRoot.Description = "LibrePDF Studio - Suite PDF 100% Locale e Privata"
$shortcutRoot.IconLocation = "$currentDir\librepdf.ico,0"
$shortcutRoot.Save()

Write-Host "[OK] Collegamento pronto nella cartella principale: LibrePDF.lnk" -ForegroundColor Cyan

# 2. Tenta di posizionarlo sul Desktop dell'utente
try {
    $desktop = [Environment]::GetFolderPath('Desktop')
    if (-not $desktop) {
        $desktop = "$env:USERPROFILE\Desktop"
    }
    if ($desktop -and (Test-Path $desktop)) {
        $desktopShortcutPath = Join-Path $desktop "LibrePDF.lnk"
        Copy-Item -Path $rootShortcutPath -Destination $desktopShortcutPath -Force
        Write-Host "[OK] Collegamento posizionato con successo sul tuo Desktop!" -ForegroundColor Green
    }
} catch {
    Write-Host "[INFO] Per avere l'icona sul Desktop, fai clic destro su 'LibrePDF.lnk' -> Invia a -> Desktop (crea collegamento)" -ForegroundColor Yellow
}
