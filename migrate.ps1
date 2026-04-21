$sourceLayout = "c:\Users\IPK Computers\Desktop\Seller\src\components\SellerLayout.jsx"
$destLayout = "c:\Users\IPK Computers\Desktop\Softwareproject23fontendMediCareXgroup8\src\layouts\PharmacistLayout.jsx"

$content = Get-Content $sourceLayout -Raw
$content = $content -replace "Seller", "Pharmacist"
Set-Content -Path $destLayout -Value $content -Encoding UTF8

$sourceSidebar = "c:\Users\IPK Computers\Desktop\Seller\src\components\SellerSidebar.jsx"
$destSidebar = "c:\Users\IPK Computers\Desktop\Softwareproject23fontendMediCareXgroup8\src\components\PharmacistSidebar.jsx"
$content = Get-Content $sourceSidebar -Raw
$content = $content -replace "Seller", "Pharmacist"
$content = $content -replace "path: '/", "path: '/pharmacist/"
$content = $content -replace "to=`"/", "to=`"/pharmacist/"
Set-Content -Path $destSidebar -Value $content -Encoding UTF8

$sourceHeader = "c:\Users\IPK Computers\Desktop\Seller\src\components\SellerHeader.jsx"
$destHeader = "c:\Users\IPK Computers\Desktop\Softwareproject23fontendMediCareXgroup8\src\components\PharmacistHeader.jsx"
$content = Get-Content $sourceHeader -Raw
$content = $content -replace "Seller", "Pharmacist"
$content = $content -replace "navigate\('/", "navigate('/pharmacist/"
Set-Content -Path $destHeader -Value $content -Encoding UTF8

$destPagesDir = "c:\Users\IPK Computers\Desktop\Softwareproject23fontendMediCareXgroup8\src\pages\pharmacist"
if (-not (Test-Path $destPagesDir)) {
    New-Item -ItemType Directory -Path $destPagesDir | Out-Null
}

$pages = Get-ChildItem "c:\Users\IPK Computers\Desktop\Seller\src\pages" -Filter "Seller*.jsx"
foreach ($page in $pages) {
    $newName = $page.Name -replace "Seller", "Pharmacist"
    $destFile = Join-Path $destPagesDir $newName
    $content = Get-Content $page.FullName -Raw
    $content = $content -replace "Seller", "Pharmacist"
    $content = $content -replace "navigate\('/", "navigate('/pharmacist/"
    $content = $content -replace "to=`"/", "to=`"/pharmacist/"
    Set-Content -Path $destFile -Value $content -Encoding UTF8
}
