@ECHO OFF
set shortcut_name=Web IDE (Brackets)
set execute_file=bracktes.bat
set icon_file=brackets-128.png
set program_path=%INSTALLED_PATH%\ide\brackets
set execute_path=%program_path%\%execute_file%
set icon_path=%program_path%/src
ver | find "Version 6" && set DIR=%LOCALAPPDATA%|| set DIR=%APPDATA%
set CHROME=%DIR%\Google\Chromium\Application\chrome.exe


echo Installing Chromium...
%program_path%/ChromeSetup.exe
%CHROME%  --load-extension="%program_path" -enable-extensions --enable-experimental-extension-apis --app-id=ndkfbceolndnebmnfbmhlpncgmnnnjhb




echo Setting shortcut...
wscript.exe "%MAKESHORTCUT_PATH%" /shortcut:"%shortcut_name%" /target:"%execute_path%" /icon:"%icon_path%\%icon_file%"

echo Make shortcut success.
exit 0