$xlsxPath = (Get-ChildItem -LiteralPath 'C:\Users\khamis\Documents\fleetifyapp\outputs\01a049c7-4eac-7af1-9ea6-cc98731c168f' -Filter '*.xlsx' | Select-Object -First 1).FullName
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($xlsxPath)
try {
    $xmlEntries = $archive.Entries | Where-Object { $_.FullName -like '*.xml' -or $_.FullName -like '*.rels' }
    $parseErrors = @()
    foreach ($entry in $xmlEntries) {
        $entryName = $entry.FullName
        $reader = [System.IO.StreamReader]::new($entry.Open())
        try {
            $xml = $reader.ReadToEnd()
        }
        finally {
            $reader.Dispose()
        }
        try {
            [xml]$null = $xml
        }
        catch {
            $parseErrors += $entryName
        }
        if ($entryName -eq 'xl/worksheets/sheet1.xml' -or $entryName -eq 'xl/worksheets/sheet8.xml') {
            $hyperlinkFormulaCount = ([regex]::Matches($xml, '<(?:[A-Za-z_][\w.-]*:)?f[^>]*>[^<]*HYPERLINK')).Count
            $errorCellCount = ([regex]::Matches($xml, '<(?:[A-Za-z_][\w.-]*:)?c[^>]*t="e"')).Count
            Write-Output "$entryName hyperlink_formulas=$hyperlinkFormulaCount error_cells=$errorCellCount"
        }
    }
    Write-Output "xml_parts=$($xmlEntries.Count) parse_errors=$($parseErrors.Count)"
    if ($parseErrors.Count -gt 0) {
        $parseErrors | ForEach-Object { Write-Output "parse_error=$_" }
        exit 1
    }
}
finally {
    $archive.Dispose()
}
