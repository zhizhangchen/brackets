var connect = require('connect');
var httpProxy = require('http-proxy');
var serverRoot= __dirname + "/../../../..";
var proxy = new httpProxy.RoutingProxy();
var http = require('http');
var commonApps = connect()
        .use(connect.cookieParser())
        .use(connect.cookieSession({ secret: 'keyboard cat', cookie: { maxAge: 60000 }}))
        .use(connect.query());

var server = connect()
        .use(connect.favicon())
        .use(connect.logger('dev'))
        .use("/brackets", connect.static(serverRoot, {hidden:true}))
        .use("/brackets", connect.directory(serverRoot, {hidden: true}))
        .use(commonApps)
        .use( function (req, res, next) {
            if (req.url.indexOf("/WidgetDebug") === 0 ||
                req.url.indexOf("/inspector.html?") === 0) {
                if (req.query.port)
                    req.session.port = req.query.port;
                console.log("session.port:" + req.session.port);
            }
            proxy.proxyRequest(req, res, {
                          port: req.session.port,
                          host: 'localhost',
                        });
        }).listen(8080);

server.on('upgrade', function(req, socket, head) {
  // Proxy websocket requests
  console.log("Upgrading " + req.url);
  if (req.url.indexOf ("/socket.io") !== 0) {
    req.originalUrl = req.url;
    commonApps.handle(req, { on: function () {} }, function (err) {
        console.warn("Handle websocket request error", err);
    });
    var wsProxy = new httpProxy.HttpProxy({
      target: {
        host: 'localhost',
        port: req.session.port
      }
    });
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
everyone.now.startProject = function(device, projectRoot, callback){
    var projectPath = projectsRoot +"/" + projectRoot.fullPath;
    var projectName = projectRoot.name.replace(/ /g, "\\ ");
    var pkgName = projectName+".wgt";
    var projectInfo = {
        projectId: "",
        projectName: projectName,
        TEST_WIDGETS_DIR: "/opt/usr/apps/widgets/test-widgets/",
        pkgName: pkgName,
        tmpPkg: "/tmp/" + pkgName
    };
    var deploy_scripts = fs.readFileSync("src/deploy_app.sh");
    var _execDeviceCommand = function (cmd, callback) {
        execDeviceCommand(device, cmd, callback);
    }
    if (!fs.existsSync(projectPath)) {
        console.error("project path doesn't exist");
        return;
    }
    var cwd = process.cwd();
    process.chdir(projectPath);
    if (fs.existsSync(projectRoot.name + ".wgt"))
        fs.unlinkSync(projectRoot.name + ".wgt");
    if (!fs.existsSync("config.xml")) {
        child_process.exec(cwd + "/src/web_gen.sh " + projectName, function (err, stdout, stderr) {
            console.log(stdout);
            console.log(stderr);
            projectInfo.projectId = /<tizen:application id="(.*)"/.exec(fs.readFileSync("config.xml"))[1];
            process.chdir(cwd);
            everyone.now.startProject(device, projectRoot, callback);
        })
    }
    else {
        projectInfo.projectId = /<tizen:application id="(\S*)"/.exec(fs.readFileSync("config.xml"))[1];
        if (!fs.existsSync(".project")) {
            var templatePath = serverRoot + "/src/extensions/default/tizen/WebProject/",
                replaceProjectName = function (file) {
                    fs.readFile(file, "ascii", function (err, data) {
                        fs.writeFile(file,
                            data.replace(/#PROJECT_NAME#/g,
                                projectRoot.name),
                            "ascii");
                    });
                },
                copyTemplateFile = function (file, replaceName) {
                    fs.createReadStream(templatePath + file)
                        .on('end', function () {
                            if (replaceName)
                                replaceProjectName(projectPath + file);
                        })
                        .pipe(fs.createWriteStream(projectPath + file));
                };
            copyTemplateFile(".project", true);
        }
        console.log("Starting project:" + projectPath + ". projectId:" + projectInfo.projectId);
        callback && callback(projectInfo.projectId);
        child_process.exec("web-packaging", function (err, stdout, stderr) {
            console.log(stdout);
            console.log(stderr);
            _execDeviceCommand("shell mdkir -p " + projectInfo.TEST_WIDGETS_DIR, function () {
                _execDeviceCommand("push " + pkgName + " "+ projectInfo.tmpPkg, function(err, stdout, stderr) {
                    process.chdir(cwd);
                    console.log(stdout);
                    console.log(stderr);
                    var env = "";
                    for (var prop in projectInfo)
                        env += prop + "=" + projectInfo[prop] + ";"
                    _execDeviceCommand("shell '" + env
                        + deploy_scripts + "'", function (err, stdout, stderr) {
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
                            }
                        })
                    });
                });
            });
        })
    }
};