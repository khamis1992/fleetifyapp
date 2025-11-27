# Script to rename migration files to follow Supabase naming convention
# Format: <timestamp>_description.sql

$MigrationDir = "c:\Users\khamis\fleetifyapp\supabase\migrations"
$Files = Get-ChildItem -Path $MigrationDir -Filter "*.sql"

Write-Host "Found $($Files.Count) migration files to process"

foreach ($File in $Files) {
    $FileName = $File.Name
    
    # Skip files that already follow the correct pattern
    if ($FileName -match '^\d{14}_[a-zA-Z0-9_-]+\.sql$' -and $FileName -notmatch '^\d{14}_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.sql$') {
        Write-Host "Skipping correctly named file: $FileName"
        continue
    }
    
    # Handle files with just timestamp and .sql extension
    if ($FileName -match '^(\d{14})\.sql$') {
        $Timestamp = $matches[1]
        $NewName = "${Timestamp}_unnamed_migration.sql"
        Write-Host "Renaming $FileName to $NewName"
        Rename-Item -Path $File.FullName -NewName $NewName
        continue
    }
    
    # Handle files with timestamp and UUID pattern
    if ($FileName -match '^(\d{14})_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.sql$') {
        $Timestamp = $matches[1]
        $NewName = "${Timestamp}_auto_generated_migration.sql"
        Write-Host "Renaming $FileName to $NewName"
        Rename-Item -Path $File.FullName -NewName $NewName
        continue
    }
    
    # Handle files with timestamp and UUID pattern (alternative format)
    if ($FileName -match '^(\d{14})_[0-9a-f\-]+\.sql$') {
        $Timestamp = $matches[1]
        $NewName = "${Timestamp}_auto_generated_migration.sql"
        Write-Host "Renaming $FileName to $NewName"
        Rename-Item -Path $File.FullName -NewName $NewName
        continue
    }
    
    Write-Host "Skipping file with unknown pattern: $FileName"
}

Write-Host "Migration file renaming complete!"