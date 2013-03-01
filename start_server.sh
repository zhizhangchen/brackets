#Please install tightvnc/turbovnc/vnc4server before starting noVNC server
NOVNC_DIR=src/thirdparty/noVNC
sudo apt-get install tightvncserver
mkdir -p ~/.vnc
cp $NOVNC_DIR/xstartup $NOVNC_DIR/start_emulator.sh ~/.vnc
vncserver -geometry 520x700
$NOVNC_DIR/utils/launch.sh --vnc localhost:5901 &

node src/extensions/default/devices/EmulatorServer.js
