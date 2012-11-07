@ECHO OFF
set shortcut_name=Web IDE (Brackets)
set execute_file=bracktes.bat
set icon_file=brackets-128.png
set program_path=%INSTALLED_PATH%\ide\brackets
set execute_path=%program_path%\%execute_file%
set icon_path=%program_path%/src

echo Setting shortcut...
wscript.exe "%MAKESHORTCUT_PATH%" /shortcut:"%shortcut_name%" /target:"%execute_path%" /icon:"%icon_path%\%icon_file%"

echo Make shortcut success.
exit 0