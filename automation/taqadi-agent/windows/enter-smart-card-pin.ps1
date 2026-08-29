[CmdletBinding()]
param([int]$TimeoutSeconds = 30)

$ErrorActionPreference = 'Stop'
$pin = $env:TAQADI_SMART_CARD_PIN
if (-not $pin) { exit 3 }

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$arabicWindowsSecurity = -join ([char[]](
  1571, 1605, 1575, 1606, 32, 87, 105, 110, 100, 111, 119, 115
))
$arabicSmartCard = -join ([char[]](
  1575, 1604, 1576, 1591, 1575, 1602, 1577, 32,
  1575, 1604, 1584, 1603, 1610, 1577
))
$windowNamePattern = (
  'Windows Security|Smart Card|{0}|{1}' `
    -f $arabicWindowsSecurity, $arabicSmartCard
)
$browserProcessNames = @(
  'chrome',
  'msedge',
  'firefox',
  'brave'
)

while ((Get-Date) -lt $deadline) {
  $windows = [System.Windows.Automation.AutomationElement]::RootElement.FindAll(
    [System.Windows.Automation.TreeScope]::Children,
    [System.Windows.Automation.Condition]::TrueCondition
  )
  foreach ($window in $windows) {
    if ($window.Current.Name -notmatch $windowNamePattern) { continue }
    try {
      $windowProcess = Get-Process -Id $window.Current.ProcessId -ErrorAction Stop
      if ($browserProcessNames -contains $windowProcess.ProcessName.ToLowerInvariant()) {
        continue
      }
    } catch {
      continue
    }
    $pinFields = $window.FindAll(
      [System.Windows.Automation.TreeScope]::Descendants,
      [System.Windows.Automation.PropertyCondition]::new(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Edit
      )
    )
    foreach ($pinField in $pinFields) {
      if (-not $pinField.Current.IsEnabled) { continue }
      $isPassword = $pinField.GetCurrentPropertyValue(
        [System.Windows.Automation.AutomationElement]::IsPasswordProperty,
        $true
      )
      if ($isPassword -ne $true) { continue }
      $pinField.SetFocus()
      Start-Sleep -Milliseconds 150
      [System.Windows.Forms.SendKeys]::SendWait($pin)
      [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
      exit 0
    }
  }
  Start-Sleep -Milliseconds 250
}

exit 2
