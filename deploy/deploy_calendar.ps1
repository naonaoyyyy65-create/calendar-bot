# Deploy calendar-bot (Node.js) from your PC to the Raspberry Pi (or any SSH host) and restart the systemd service.
# Usage: powershell -File deploy/deploy_calendar.ps1
#
# One-time setup required on the remote host before the first run (not done by this script):
#   1. mkdir -p /home/<user>/apps/calendar-bot/src /home/<user>/apps/calendar-bot/credentials
#   2. Copy your Google service account key JSON into
#      /home/<user>/apps/calendar-bot/credentials/service-account.json
#   3. Create /home/<user>/apps/calendar-bot/.env (see .env.example for the keys)
#   4. sudo cp deploy/calendar-bot.service /etc/systemd/system/calendar-bot.service
#      sudo systemctl daemon-reload
#      sudo systemctl enable calendar-bot
#   5. Register the cron entry points (crontab -e):
#      0 8 * * 1   cd /home/<user>/apps/calendar-bot && /usr/bin/node src/sendMonthlyCalendar.js >> monthly.log 2>&1
#      0 8 * * *   cd /home/<user>/apps/calendar-bot && /usr/bin/node src/sendTodaySchedule.js >> today.log 2>&1
#      0 */12 * * * cd /home/<user>/apps/calendar-bot && /usr/bin/node src/checkCalendarUpdates.js >> updates.log 2>&1
#
# Note: this file is saved as UTF-8 with a BOM and its comments are kept ASCII-only so that
# Windows PowerShell 5.1 (which reads non-BOM .ps1 files using the system's legacy ANSI
# codepage) never misreads it regardless of the machine's locale.

$ErrorActionPreference = "Stop"
$remoteHost = "your-pi-host.local"   # e.g. raspberrypi.local, or an IP address
$remoteUser = "<user>"
$remoteDir = "/home/$remoteUser/apps/calendar-bot"
$localDir = Split-Path -Parent $PSScriptRoot

Write-Host "Ensuring remote directories exist..."
ssh "$remoteHost" "mkdir -p $remoteDir/src"

Write-Host "Uploading package.json..."
scp "$localDir\package.json" "${remoteHost}:${remoteDir}/package.json"

Write-Host "Uploading src/*.js..."
scp "$localDir\src\*.js" "${remoteHost}:${remoteDir}/src/"

Write-Host "Installing dependencies and restarting service..."
ssh "$remoteHost" "cd $remoteDir && npm install --omit=dev && sudo systemctl restart calendar-bot"

Write-Host "Done."
