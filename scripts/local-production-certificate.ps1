param(
  [Parameter(Mandatory = $true)][string]$OutputDirectory,
  [switch]$TrustForCurrentUser
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path 'Cert:\CurrentUser\My')) {
  throw 'The current-user Windows certificate store is unavailable.'
}
if (-not $env:AOP_LOCAL_CERT_PASSWORD) {
  throw 'AOP_LOCAL_CERT_PASSWORD is required only for the generated local PFX.'
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$pfxPath = Join-Path $OutputDirectory 'localhost.pfx'
$cerPath = Join-Path $OutputDirectory 'localhost.cer'
$pemPath = Join-Path $OutputDirectory 'localhost.pem'

if (-not (Test-Path -LiteralPath $pfxPath)) {
  $certificate = New-SelfSignedCertificate `
    -DnsName 'localhost' `
    -Type SSLServerAuthentication `
    -CertStoreLocation 'Cert:\CurrentUser\My' `
    -FriendlyName 'AI Operations Platform local-only HTTPS' `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -HashAlgorithm SHA256 `
    -KeyExportPolicy Exportable `
    -NotAfter (Get-Date).AddMonths(3)
  $password = ConvertTo-SecureString $env:AOP_LOCAL_CERT_PASSWORD -AsPlainText -Force
  Export-PfxCertificate -Cert $certificate -FilePath $pfxPath -Password $password | Out-Null
  Export-Certificate -Cert $certificate -FilePath $cerPath | Out-Null
  $der = [System.IO.File]::ReadAllBytes($cerPath)
  $body = [Convert]::ToBase64String($der, [Base64FormattingOptions]::InsertLineBreaks)
  [System.IO.File]::WriteAllText($pemPath, "-----BEGIN CERTIFICATE-----`n$body`n-----END CERTIFICATE-----`n")
}

if ($TrustForCurrentUser) {
  $certificate = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($cerPath)
  $existing = Get-Item -LiteralPath ("Cert:\CurrentUser\Root\" + $certificate.Thumbprint) -ErrorAction SilentlyContinue
  if (-not $existing) {
    Import-Certificate -FilePath $cerPath -CertStoreLocation 'Cert:\CurrentUser\Root' | Out-Null
  }
  Write-Output "Trusted only the generated localhost certificate for the current Windows user ($($certificate.Thumbprint))."
} else {
  Write-Output 'Localhost certificate generated but not trusted. Pass -TrustForCurrentUser only after reviewing this operation.'
}
