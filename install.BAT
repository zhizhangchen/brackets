@ECHO OFF
set shortcut_name=Web IDE (Brackets)
set execute_file=brackets.bat
set icon_file=brackets.ico
set program_path=%INSTALLED_PATH%\ide\brackets
set execute_path=%program_path%\%execute_file%
set icon_path=%program_path%
set extension_install_dir=%APPDATA%\Adobe\Brackets\extensions\user

rmdir /s /q %extension_install_dir%\web-simulator
mkdir %extension_install_dir%
xcopy /y /e %program_path%\src\extensions\user %extension_install_dir%

echo Setting shortcut...
wscript.exe "%MAKESHORTCUT_PATH%" /shortcut:"%shortcut_name%" /target:"%execute_path%" /icon:"%icon_path%\%icon_file%"

echo Make shortcut success.
exit 0