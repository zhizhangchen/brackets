#Please install tightvnc/turbovnc/vnc4server before starting noVNC server
NOVNC_DIR=src/thirdparty/noVNC
sudo apt-get install tightvncserver
mkdir -p ~/.vnc
cp $NOVNC_DIR/xstartup ~/.vnc
vncserver
$NOVNC_DIR/utils/launch.sh --vnc localhost:5901

node src/extensions/devices/EmulatorServer.js
