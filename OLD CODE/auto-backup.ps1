$backupDir = "C:\Cedar3Backups"
if (!(Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
$stamp = Get-Date -Format "yyyyMMdd_HHmm"
$source = "C:\Cedar3Web\data\workshop-db.json"
$dest = "$backupDir\db_$stamp.json"
if (Test-Path $source) {
    Copy-Item $source $dest
    Write-Host "Backup successful: $dest"
    # Keep only last 30 backups
    Get-ChildItem "$backupDir\db_*.json" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 30 | Remove-Item -Force
} else {
    Write-Host "Source database not found!"
}
