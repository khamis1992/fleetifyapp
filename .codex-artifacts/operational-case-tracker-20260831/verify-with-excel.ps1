$outputDir = 'C:\Users\khamis\Documents\fleetifyapp\outputs\01a049c7-4eac-7af1-9ea6-cc98731c168f'
$xlsxPath = (Get-ChildItem -LiteralPath $outputDir -Filter '*.xlsx' | Select-Object -First 1).FullName
$excel = $null
$workbook = $null
try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $excel.AskToUpdateLinks = $false
    $workbook = $excel.Workbooks.Open($xlsxPath, 0, $true)
    $summary = $workbook.Worksheets.Item(1)
    $tracker = $workbook.Worksheets.Item(8)

    $checks = @(
        @{ Address = 'Summary!B3'; Cell = $summary.Range('B3') },
        @{ Address = 'Tracker!B4'; Cell = $tracker.Range('B4') },
        @{ Address = 'Tracker!L6'; Cell = $tracker.Range('L6') },
        @{ Address = 'Tracker!M6'; Cell = $tracker.Range('M6') },
        @{ Address = 'Tracker!N6'; Cell = $tracker.Range('N6') }
    )
    foreach ($check in $checks) {
        $formula = [string]$check.Cell.Formula
        $text = [string]$check.Cell.Text
        $hasHyperlinkFormula = $formula.Contains('HYPERLINK')
        Write-Output "$($check.Address) hyperlink_formula=$hasHyperlinkFormula text=$text"
        if (-not $hasHyperlinkFormula -or $text.Contains('not implemented')) {
            exit 1
        }
    }
    $statusText = [string]$tracker.Range('J6').Text
    $statusValidationType = $tracker.Range('K6').Validation.Type
    Write-Output "Tracker!J6 contract_status=$statusText"
    Write-Output "Tracker!K6 status_validation_type=$statusValidationType"
    if ([string]::IsNullOrWhiteSpace($statusText) -or $statusValidationType -ne 3) {
        exit 1
    }
    Write-Output "excel_open=ok sheets=$($workbook.Worksheets.Count) tracker_rows=$($tracker.UsedRange.Rows.Count)"
}
finally {
    if ($null -ne $workbook) {
        $workbook.Close($false)
    }
    if ($null -ne $excel) {
        $excel.Quit()
    }
}
