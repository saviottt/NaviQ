# Simple development server launcher
Write-Host "Starting local development server on http://localhost:8000 ..." -ForegroundColor Cyan

if (Get-Command python -ErrorAction SilentlyContinue) {
    python -m http.server 8000
} elseif (Get-Command npx -ErrorAction SilentlyContinue) {
    npx -y http-server -p 8000
} else {
    Write-Error "Neither Python nor Node.js (npx) was found in your PATH. Please install one to run the server."
}
