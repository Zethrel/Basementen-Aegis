# sign_app.ps1
# Script to create a self-signed code-signing certificate and sign the compiled Basementen Aegis executable.
#
# The certificate is valid for 5 years and is reused on every run once created.
# Always build and sign on the same machine: a new machine means a new certificate,
# a changed AegisRoot.cer, and fresh "unrecognized publisher" prompts for every user.

$CertSubject = "CN=Basementen Aegis Developer"
$CertStorePath = "Cert:\CurrentUser\My"
$TargetExe = "dist\BasementenAegis.exe"
$PublicCertPath = "AegisRoot.cer"

# 1. Look for an existing code-signing certificate we created
Write-Host "Checking for existing Basementen Aegis code-signing certificate..." -ForegroundColor Cyan
$Cert = Get-ChildItem -Path $CertStorePath | Where-Object { $_.Subject -eq $CertSubject } | Select-Object -First 1

if ($null -eq $Cert) {
    Write-Host "No certificate found. Creating a new self-signed Code Signing Certificate (valid 5 years)..." -ForegroundColor Yellow
    # Create the certificate in CurrentUser\My store
    $Cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject $CertSubject -KeyUsage DigitalSignature -FriendlyName "Basementen Aegis Code Signing Cert" -CertStoreLocation $CertStorePath -NotAfter (Get-Date).AddYears(5)
    Write-Host "Created certificate with Thumbprint: $($Cert.Thumbprint)" -ForegroundColor Green
} else {
    Write-Host "Found existing certificate with Thumbprint: $($Cert.Thumbprint) (expires $($Cert.NotAfter))" -ForegroundColor Green
    if ($Cert.NotAfter -lt (Get-Date)) {
        Write-Warning "This certificate has EXPIRED. Delete it from Cert:\CurrentUser\My and re-run this script to create a fresh 5-year certificate."
        exit 1
    }
}

# 2. Export the public key certificate (.cer) - runs before the exe check so the
#    certificate can be generated ahead of the first build (the .cer is bundled
#    into the executable by the PyInstaller spec).
Write-Host "Exporting public certificate to $PublicCertPath..." -ForegroundColor Cyan
Export-Certificate -Cert $Cert -FilePath $PublicCertPath -Type CERT | Out-Null
Write-Host "Exported!" -ForegroundColor Green

# 3. Trust the certificate locally (CurrentUser scope, no admin required)
Write-Host "Installing certificate to Current User's Trusted Roots and Trusted Publishers..." -ForegroundColor Cyan
Import-Certificate -FilePath $PublicCertPath -CertStoreLocation Cert:\CurrentUser\Root | Out-Null
Import-Certificate -FilePath $PublicCertPath -CertStoreLocation Cert:\CurrentUser\TrustedPublisher | Out-Null
Write-Host "Certificate is now locally trusted for this user account!" -ForegroundColor Green

# 4. Sign the executable (skipped if it hasn't been built yet)
if (-not (Test-Path $TargetExe)) {
    Write-Warning "Could not find $TargetExe - certificate created/exported, but nothing was signed."
    Write-Host "Build the application with PyInstaller, then re-run this script to sign it." -ForegroundColor Yellow
    exit 0
}

Write-Host "Signing $TargetExe..." -ForegroundColor Cyan
$Signature = Set-AuthenticodeSignature -FilePath $TargetExe -Certificate $Cert
if ($Signature.Status -eq "Valid") {
    Write-Host "Successfully signed! $TargetExe is now authenticated by the certificate." -ForegroundColor Green
} else {
    Write-Warning "Signing status: $($Signature.Status) - $($Signature.StatusMessage)"
}
