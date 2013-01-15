var connect = require('connect');
var httpProxy = require('http-proxy');
var serverRoot= __dirname + "/../../../..";
var proxy = new httpProxy.RoutingProxy();
var http = require('http');
var server = connect()
        .use(connect.favicon())
        .use(connect.logger('dev'))
        .use("/brackets", connect.static(serverRoot, {hidden:true}))
        .use("/brackets", connect.directory(serverRoot, {hidden: true}))
        .use(connect.cookieParser())
        .use(connect.session({ secret: 'keyboard cat', key: 'sid', cookie: { secure: true }}))
        .use( function (req, res, next) {
            if (req.url.indexOf("/WidgetDebug") === 0 ||
                req.url.indexOf("/inspector.html?") === 0) {
                connect.query()(req, res, function() {});
                console.log("query:" + JSON.stringify(req.query));
                req.session.port = req.query['port'];
                console.log("session.port:" + req.session.port);
            }
            console.log("proxying to localhost:" + req.session.port);
            proxy.proxyRequest(req, res, {
                          port: req.session.port,
                          host: 'localhost',
                        });
        }).listen(8080);

server.on('upgrade', function(req, socket, head) {
  // Proxy websocket requests
  console.log("Upgrading " + req.url);
  if (req.url.indexOf ("/socket.io") !== 0) {
    connect.query()(req, null, function() {});
    var wsProxy = new httpProxy.HttpProxy({
      target: {
        host: 'localhost',
        port: req.query['port']
      }
    });
    console.log("proxying to localhost:" + req.query.port);
    wsProxy.proxyWebSocketRequest(req, socket, head);
  }
});

var nowjs = require("now");
var everyone = nowjs.initialize(server, {socketio: {'destroy upgrade': false}});
var oldDirectoryHtml = connect.directory.html;
var ports = {};
var fs = require('fs');
var os = require('os');
var child_process = require('child_process');
var projectsRoot = os.tmpDir() + "/brackets-projects";
function mkdirIfNeeded(path) {
    if (!fs.existsSync(path))
        fs.mkdirSync(path);
    console.log("made dir", path);
}
connect.directory.html = function(req, res, files, next, dir, showUp, icons){
 res.setHeader('IsDirectory', "true");
 oldDirectoryHtml(req, res, files, next, dir, showUp, icons);
}

var execDeviceCommand = function (device, cmd, callback) {
    cmd = "sdb -s " + device + " " + cmd;
    console.log("cmd:" +  cmd);
    child_process.exec(cmd, callback);
};

everyone.now.writeProjectFile = function(fullPath, data) {
    var currentDir = projectsRoot;
    var dirs = fullPath.split("/");
    dirs.pop();
    mkdirIfNeeded(currentDir);
    dirs.forEach(function (dir) {
        mkdirIfNeeded(currentDir += "/" + dir);
    })
    fs.writeFileSync(projectsRoot +"/" +  fullPath, data);
}
everyone.now.getDevices = function(callback) {
     child_process.exec('sdb devices', callback);
}
everyone.now.pushProjectFileToDevice = function(projectId, fullPath, data, device, callback) {
    var serverFullPath = projectsRoot + "/" + fullPath;
    var deviceBaseDir = "/opt/usr/apps/" + projectId + "/res/wgt/";
    fs.writeFile(serverFullPath, data, function () {
        execDeviceCommand(device, "push " + serverFullPath.replace(/ /g, "\\ ") + " " + deviceBaseDir, callback);
    });
}
everyone.now.startProject = function(device, projectRoot, projectId){
    var projectPath = projectsRoot +"/" + projectRoot.fullPath;
    var projectName = projectRoot.name.replace(/ /g, "\\ ");
    var pkgName = projectName + ".wgt";
    var portKey = device + "." + projectId;
    var TEST_WIDGETS_DIR = "/opt/usr/apps/widgets/test-widgets/";
    var tmpPkg = "/tmp/" + pkgName;
    var testPkg = TEST_WIDGETS_DIR + pkgName;
    var WRT_LAUNCHER = "/usr/bin/wrt-launcher";
    var WGT_CMD = "pkgcmd -t wgt -q ";
    var namedWgtCmd = WGT_CMD + " -n " + projectId;
    var _execDeviceCommand = function (cmd, callback) {
        execDeviceCommand(device, cmd, callback);
    }
    console.log("Starting project:" + projectPath + ". projectId:" + projectId);
    if (!fs.existsSync(projectPath)) {
        console.error("project path doesn't exist");
        return;
    }
    process.chdir(projectPath);
    if (fs.existsSync(projectRoot.name + ".wgt"))
        fs.unlinkSync(projectRoot.name + ".wgt");
    child_process.exec("web-packaging", function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        _execDeviceCommand("shell mdkir -p " + TEST_WIDGETS_DIR, function () {
            _execDeviceCommand("push " + pkgName + " "+ tmpPkg, function(err, stdout, stderr) {
                console.log(stdout);
                console.log(stderr);
                _execDeviceCommand("shell 'unzip -p " + tmpPkg
                    + " > t && unzip -p " + testPkg + ">t1 ;if [ " + ports[portKey]
                    + " == undefined ] || ! diff t t1 >/dev/null  ; then cp "
                    + tmpPkg + " " + TEST_WIDGETS_DIR
                    + " && " + WRT_LAUNCHER + " --developer-mode 1 && " + namedWgtCmd
                    + " -s  && " + namedWgtCmd + " -u;"
                    + WGT_CMD + " -i -p " + testPkg + " && " + WRT_LAUNCHER + " --start "
                    + projectId + " --debug --timeout=90 ; else echo port: "
                    + ports[portKey] + "; fi'", function (err, stdout, stderr) {
                    console.log(stderr);
                    stdout.split("\n").forEach (function (line) {
                        console.log("line:" + line);
                        if (line.indexOf("port:") !== -1) {
                            var port = line.split(" ")[1];
                            console.log("got port:" + port);
                            console.log("setting up forward " + port);
                            _execDeviceCommand("forward tcp:" + port + " tcp:" +
                                port, function() {
                                console.log("getting debug url:" + port);
                                everyone.now.setDebuggingPort(port);
                            });
                            ports[portKey] = port;
                        }
                    })
                });
            });
        });
    })
};