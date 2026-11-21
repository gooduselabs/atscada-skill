# Reports what this machine has for an ATSCADA project and where it is: ATDriver Server (+ installed driver DLLs),
# ATSCADA tool DLLs, the Fastweb runtime, MSBuild, Node.js, a browser for SVG previews, MySQL.
# Read-only: it changes nothing.   Usage:  pwsh -File find-atscada.ps1 [-Root "D:\ATPro"]
param([string]$Root = "")

$roots = @()
if ($Root) { $roots += $Root }
$roots += @("$env:ProgramFiles\ATPro", "${env:ProgramFiles(x86)}\ATPro")
Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue | ForEach-Object { $roots += (Join-Path $_.Root "ATPro") }
$roots = $roots | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

function Find-First([string[]]$relative) {
    foreach ($r in $roots) { foreach ($rel in $relative) { $p = Join-Path $r $rel; if (Test-Path $p) { return $p } } }
    return $null
}
function Show([string]$name, $value, [string]$note = "") {
    if ($value) { "{0,-22} {1}" -f $name, $value } else { "{0,-22} NOT FOUND{1}" -f $name, $(if ($note) { "  ($note)" } else { "" }) }
}

"ATPro install roots:   " + $(if ($roots) { $roots -join "; " } else { "none found (pass -Root <folder> if ATSCADA is installed elsewhere)" })
""
$ads = Find-First @("ATDriverServer")
Show "ATDriver Server" $ads "ATFiles can still be written; use the default DLL path and say they were not tested"
if ($ads) {
    $drv = Join-Path $ads "Drivers"
    Show "  driver folder" $(if (Test-Path $drv) { $drv })
    if (Test-Path $drv) {
        $skip = "Newtonsoft.Json.dll", "SnmpSharpNet.dll", "Interop.OPCAutomation.dll", "SQLCon.dll"
        "  installed drivers:   " + ((Get-ChildItem $drv -Filter *.dll | Where-Object { $skip -notcontains $_.Name } | ForEach-Object { $_.Name }) -join ", ")
    }
    foreach ($f in "ATDriverBase.dll", "ATDriverWCFInterface.dll") { Show "  $f" $(if (Test-Path (Join-Path $ads $f)) { "ok" }) }
}
""
$ats = Find-First @("ATSCADA")
Show "ATSCADA (tool DLLs)" $ats "the desktop app cannot be built on this machine"
if ($ats) {
    $missing = "iDriver.dll", "iTools.dll", "iWebService.dll", "DriverPluginInterface.dll", "ToolExtensions.dll", "MySql.Data.dll", "Drivers\ATDriverClient.dll" | Where-Object { -not (Test-Path (Join-Path $ats $_)) }
    "  reference DLLs:      " + $(if ($missing) { "MISSING " + ($missing -join ", ") } else { "all present" })
    "  optional tool sets:  " + (("iEnergyTools", "iLEANTools", "iWebAPI" | Where-Object { Test-Path (Join-Path $ats $_) }) -join ", ")
}
""
# Fastweb web template, same order as tools\setup-web.js: env variable, the publish output of the FastWeb source, then
# the runtime installed with FastWeb Designer (usually older).
$webs = @()
if ($env:ATSCADA_FASTWEB_TEMPLATE) { $webs += $env:ATSCADA_FASTWEB_TEMPLATE }
Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue | ForEach-Object { $webs += (Join-Path $_.Root "ATSCADA_Source\FastWeb\publish") }
$rt = Find-First @("FastWeb Designer\runtime-template"); if ($rt) { $webs += $rt }
$webs = @($webs | Where-Object { $_ -and (Test-Path (Join-Path $_ "bin\ATSCADAFastWeb.Component.dll")) } | Select-Object -Unique)
if (-not $webs) { Show "Fastweb web template" $null "ask the user where their Fastweb web folder is, or set ATSCADA_FASTWEB_TEMPLATE" }
$first = $true
foreach ($web in $webs) {
    Show $(if ($first) { "Fastweb web template" } else { "  other copy" }) $web
    "  built:               " + (Get-Item (Join-Path $web "bin\ATSCADAFastWeb.Component.dll")).LastWriteTime.ToString("yyyy-MM-dd HH:mm")
    $names = (Get-ChildItem (Join-Path $web "AppScripts\Component") -Directory -ErrorAction SilentlyContinue).Name
    "  components:          " + ($names.Count) + ", card v3 " + $(if ($names -contains "Cardv3") { "available" } else { "NOT in this build - use the v2 card" })
    $first = $false
}
""
$msb = $null
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (Test-Path $vswhere) { $msb = & $vswhere -latest -requires Microsoft.Component.MSBuild -find "MSBuild\**\Bin\MSBuild.exe" 2>$null | Select-Object -First 1 }
Show "MSBuild" $msb "install Visual Studio or Build Tools to build the desktop app"
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
Show "Node.js" $(if ($node) { "$node  " + (& node --version) }) "needed by tools\gen.js; ask before installing"
$browser = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe" | Where-Object { Test-Path $_ } | Select-Object -First 1
Show "Browser for previews" $browser "tools\preview.js writes .html only"
$mysql = Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "mysql|mariadb" } | Select-Object -First 1
Show "MySQL service" $(if ($mysql) { "$($mysql.Name) ($($mysql.Status))" }) "may run on another machine; ask the user"
$iis = Get-Service W3SVC -ErrorAction SilentlyContinue
Show "IIS" $(if ($iis) { "W3SVC ($($iis.Status))" }) "needed to serve the web"
"PowerShell             " + $PSVersionTable.PSVersion + $(if ($PSVersionTable.PSVersion.Major -lt 7) { "  (use PowerShell 7 for scripts that contain Vietnamese text)" } else { "" })
