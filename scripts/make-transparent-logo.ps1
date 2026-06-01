Add-Type -AssemblyName System.Drawing
$src = "C:\Users\moses\.cursor\projects\c-app-pc\assets\c__Users_moses_AppData_Roaming_Cursor_User_workspaceStorage_a9ab3c1c5587da6c930f2db665d9cb79_images_logo-c95b0fb7-5f5f-4d31-86f3-9bc7fcb3fd3f.png"
$outPng = "c:\app_pc\service_link_admin-main\src\assets\images\signin\servicelink-logo-transparent.png"

$bmp = [System.Drawing.Bitmap]::FromFile($src)
$w = $bmp.Width
$h = $bmp.Height
$out = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($y = 0; $y -lt $h; $y++) {
  for ($x = 0; $x -lt $w; $x++) {
    $c = $bmp.GetPixel($x, $y)
    $r = $c.R
    $g = $c.G
    $b = $c.B
    $min = [Math]::Min($r, [Math]::Min($g, $b))
    $max = [Math]::Max($r, [Math]::Max($g, $b))
    if ($min -ge 245 -and ($max - $min) -le 12) {
      $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $r, $g, $b))
      continue
    }
    if ($r -ge 235 -and $g -ge 235 -and $b -ge 235) {
      $fade = [Math]::Min(255, ($r + $g + $b) - 705)
      $alpha = [Math]::Max(0, 255 - ($fade * 3))
      if ($alpha -le 0) { continue }
      $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $r, $g, $b))
      continue
    }
    $out.SetPixel($x, $y, $c)
  }
}
$bmp.Dispose()

$out.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)
$out.Dispose()
Write-Output "Created $outPng ($w x $h)"
