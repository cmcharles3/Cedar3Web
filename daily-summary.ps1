# Cedar3 Daily Summary Automation
$ErrorActionPreference = "Stop"

# 1. Login to get token
$loginBody = '{"username":"charles","password":"celine"}'
$loginRes = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/admin" -Method Post -ContentType "application/json" -Body $loginBody
$headers = @{ Authorization = "Bearer $($loginRes.token)" }

# 2. Generate the summary
Invoke-RestMethod -Uri "http://localhost:3000/api/schedule/summary/generate" -Method Get -Headers $headers | Out-Null

# 3. Get the text
$textRes = Invoke-RestMethod -Uri "http://localhost:3000/api/schedule/summary/text" -Method Get -Headers $headers
$text = $textRes.text

# 4. URL Encode the text for WhatsApp
Add-Type -AssemblyName System.Web
$encodedText = [System.Web.HttpUtility]::UrlEncode($text)

# 5. Open WhatsApp Web with the pre-filled message
$waUrl = "https://wa.me/27764847360?text=$encodedText"
Start-Process $waUrl
