$outputDir = 'C:\Users\khamis\Documents\fleetifyapp\outputs\01a049c7-4eac-7af1-9ea6-cc98731c168f'
$xlsxPath = (Get-ChildItem -LiteralPath $outputDir -Filter '*.xlsx' | Select-Object -First 1).FullName

Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.Web

$archive = [System.IO.Compression.ZipFile]::Open($xlsxPath, [System.IO.Compression.ZipArchiveMode]::Update)
$repairedCells = 0
try {
    $worksheetEntries = @($archive.Entries | Where-Object { $_.FullName -like 'xl/worksheets/sheet*.xml' })
    foreach ($entry in $worksheetEntries) {
        $entryName = $entry.FullName
        $reader = [System.IO.StreamReader]::new($entry.Open(), [System.Text.Encoding]::UTF8, $true)
        try {
            $xml = $reader.ReadToEnd()
        }
        finally {
            $reader.Dispose()
        }

        $cellPattern = '<(?<prefix>[A-Za-z_][\w.-]*:)?c(?<attrs>[^>]*\bt="e"[^>]*)>(?<content>.*?)</\k<prefix>c>'
        $updatedXml = [regex]::Replace(
            $xml,
            $cellPattern,
            {
                param($match)
                $prefix = $match.Groups['prefix'].Value
                $content = $match.Groups['content'].Value
                if ($content -notmatch "<${prefix}f[^>]*>.*?HYPERLINK") {
                    return $match.Value
                }

                $friendlyName = 'فتح الرابط'
                $valueMatch = [regex]::Match($content, "<${prefix}v>(?<value>.*?)</${prefix}v>")
                if ($valueMatch.Success) {
                    $decodedValue = [System.Net.WebUtility]::HtmlDecode($valueMatch.Groups['value'].Value)
                    $marker = 'friendlyName='
                    $markerIndex = $decodedValue.LastIndexOf($marker)
                    if ($markerIndex -ge 0) {
                        $friendlyName = $decodedValue.Substring($markerIndex + $marker.Length)
                    }
                }

                $safeFriendlyName = [System.Security.SecurityElement]::Escape($friendlyName)
                if ($valueMatch.Success) {
                    $content = [regex]::Replace($content, "<${prefix}v>.*?</${prefix}v>", "<${prefix}v>$safeFriendlyName</${prefix}v>", 1)
                }
                else {
                    $content = "$content<${prefix}v>$safeFriendlyName</${prefix}v>"
                }
                $attrs = [regex]::Replace($match.Groups['attrs'].Value, '\bt="e"', 't="str"', 1)
                $script:repairedCells += 1
                return "<${prefix}c$attrs>$content</${prefix}c>"
            },
            [System.Text.RegularExpressions.RegexOptions]::Singleline
        )

        if ($updatedXml -ne $xml) {
            $entry.Delete()
            $newEntry = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
            $writer = [System.IO.StreamWriter]::new($newEntry.Open(), [System.Text.UTF8Encoding]::new($false))
            try {
                $writer.Write($updatedXml)
            }
            finally {
                $writer.Dispose()
            }
        }
    }
}
finally {
    if ($null -ne $archive) {
        $archive.Dispose()
    }
}

Write-Output "repaired_hyperlink_cells=$repairedCells"
if ($repairedCells -eq 0) {
    exit 1
}
