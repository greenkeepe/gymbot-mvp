# Script to update all admin pages with Supabase config loader

# This script adds the shared Supabase initialization to all admin pages
# that currently have hardcoded 'YOUR_KEY' placeholders

Write-Host "Updating admin pages with Supabase config loader..." -ForegroundColor Green

$files = @(
    "calendar.html",
    "courses.html",
    "staff.html",
    "pricing.html"
)

foreach ($file in $files) {
    $path = "public/admin/$file"
    Write-Host "Processing $file..." -ForegroundColor Yellow
    
    # Read file content
    $content = Get-Content $path -Raw
    
    # Replace hardcoded Supabase config with dynamic loader
    $content = $content -replace 'const SUPABASE_URL = ''https://vyspmhrbgaxvmkaqrrfo\.supabase\.co'';[\r\n\s]+const SUPABASE_ANON_KEY = ''YOUR_KEY'';[\r\n\s]+const \{ createClient \} = supabase;[\r\n\s]+const sb = createClient\(SUPABASE_URL, SUPABASE_ANON_KEY\);', ''
    
    # Add script tags before first <script> tag if not already present
    if ($content -notmatch 'supabase-init\.js') {
        $content = $content -replace '(<script>)', '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`r`n    <script src="/admin/supabase-init.js"></script>`r`n    $1'
    }
    
    # Add initSupabase() call at the beginning of async functions
    $content = $content -replace '(async function \w+\(\) \{)', '$1`r`n            const sb = await initSupabase();`r`n            if (!sb) return;'
    
    # Write back
    Set-Content -Path $path -Value $content -NoNewline
    
    Write-Host "✓ Updated $file" -ForegroundColor Green
}

Write-Host "`nAll admin pages updated successfully!" -ForegroundColor Green
