if (!window.require) {
    window.require = function () {
        return null;
    }
}
var gui = require('nw.gui');
var child_process = require('child_process');
var liveBrowser;
var ports = {};
var nodeFs = require('fs');
var os = require('os');
var upDate = new Date();
function _nodeErrorToBracketsError (err) {
    if (!err) {
        err = brackets.fs.NO_ERROR;
    }
    if (err && err.code === "ENOENT") {
        err = brackets.fs.ERR_NOT_FOUND;
    }
    return err;
}
function _dropboxErrorToBracketsError (err) {
    if (!err) {
        err = brackets.fs.NO_ERROR;
    }
    if (err && err.status === 404) {
        err = brackets.fs.ERR_NOT_FOUND;
    }
    return err;
}
var execDeviceCommand = function (cmd, callback) {
    console.log("cmd:" +  cmd);
    child_process.exec("sdb -s " + window.device + " " + cmd, callback);
};
function ShowOpenDialog ( callback, allowMultipleSelection, chooseDirectories,
                title, initialPath, fileTypes) {
    var file = $("<input type='file'/>");
    if (chooseDirectories)
        file.attr("nwdirectory", true);
    if (allowMultipleSelection)
        file.attr("multiple", true);
    file.click().change(function(evt) {
        var files = [];
        for (var i = 0; i < this.files.length; ++i)
          files.push(this.files[i].path.replace(/\\/g, "/"));
        callback(0, files);
    });
}
function ReadDir(){
    throw arguments.callee.name
}
function MakeDir(){
    throw arguments.callee.name
}
function Rename(){
    throw arguments.callee.name
}
function GetFileModificationTime(){
    return process.uptime() * 1000;
}
function QuitApplication(){
    gui.App.Quit();
}
function AbortQuit(){
    throw arguments.callee.name
}
function ShowDeveloperTools(){
    if (gui)
        gui.Window.get().showDevTools();
}
function ReadFile(){
    throw arguments.callee.name
}
function WriteFile(){
    throw arguments.callee.name
}
function SetPosixPermissions(){
    throw arguments.callee.name
}
function DeleteFileOrDirectory(){
    throw arguments.callee.name
}
function GetElapsedMilliseconds(){
    return new Date().getTime() - upDate.getTime() ;
}
function OpenBrowserWindowIfNeeded(url){
    if (window.device === "Simulator" && (!liveBrowser || !liveBrowser.onbeforeunload)) {
        liveBrowser = window.open(url, "Simulator", "toolbar=no,status=no,directories=no,location=no,titlebar=no");
        liveBrowser.onbeforeunload = function () {
            liveBrowser = null;
        };
    }
}
function OpenLiveBrowser(callback, url, enableRemoteDebugging){
    // enableRemoteDebugging flag is ignored on mac
    var NativeFileSystem = require("file/NativeFileSystem").NativeFileSystem;
    var ProjectManager = require("project/ProjectManager"),
        projectRoot = ProjectManager.getProjectRoot();

    if (window.device && window.device.indexOf("RemoteEmulator") === 0) {
        NativeFileSystem.requestNativeFileSystem(projectRoot.fullPath, function (fs) {
            var copyDirectoryToServer = function (dirEntry) {
                var  result = new $.Deferred();
                dirEntry.createReader().readEntries(function (entries) {
                    var promises = [];
                    entries.forEach(function(entry) {
                        var result, promise;
                        if (entry.isDirectory) {
                            promise = copyDirectoryToServer(entry);
                        }
                        else {
                            result = new $.Deferred();
                            promise = result.promise();
                            brackets.fs.readFile(entry.fullPath, null, function (err, data) {
                                if (err === brackets.fs.NO_ERROR) {
                                    now.writeProjectFile(entry.fullPath, data)
                                    this.resolve();
                                }
                                else
                                    this.reject();
                            }.bind(result));
                        }
                        promises.push(promise);
                    });
                    $.when.apply(null, promises).then( function () {
                        this.resolve();
                    }.bind(this));

                }.bind(result));
                return result.promise();
            };
            copyDirectoryToServer(fs.root).done(function () {
                var Inspector = require("LiveDevelopment/Inspector/Inspector");
                var iframe = $('<iframe id="remoteEmulator" frameborder="0" style="overflow:hidden;width:100%;height:100%" height="100%" width="100%"></iframe>')
                        .attr("src", "http://" + location.hostname + ":" + 6080 + "/vnc.html")
                var div = $('<div/>').append(iframe).css("overflow", "hidden")
                        .dialog({width:"550", height:"770", minWidth: "550",
                            minHeight: "770", position:"right",
                            close: function () {
                                Inspector.setSocketsGetter(null);
                                Inspector.disconnect();
                            }
                        })
                $(Inspector).off('connect.RemoteEmulator');
                $(Inspector).on('connect.RemoteEmulator', function () {
                    this.dialog("open");
                }.bind(div));
                $(Inspector).on('disconnect', function () {
                    this.dialog("close");
                }.bind(div));
                now.setDebuggingPort = function (port) {
                    console.log("setting debugging port:" + port);
                    Inspector.setSocketsGetter(function () {
                        var result = new $.Deferred();
                        $.getJSON("/WidgetDebug?port="+port, function (data) {
                            console.log("got debug url:" + data.inspector_url);
                            result.resolve ([{
                                webSocketDebuggerUrl:"ws://" + location.hostname + ":" + location.port +"/devtools/page/1?port=" + port,
                                url:url,
                                devtoolsFrontendUrl: "/" + data.inspector_url + "&&port=" + port
                            }]);
                        });
                        return result;
                    });
                    callback(0,0);
                }
                now.startProject(window.device.split(":")[1], ProjectManager.getProjectRoot(), function (projectId) {
                    ProjectManager.setProjectId(projectId);
                });
            });
        });
        return;
    }
    else if (window.device && window.device !== "Simulator") {
        var ProjectManager = require("project/ProjectManager");
        var projectRoot = ProjectManager.getProjectRoot();
        var projectName = projectRoot.name;
        var projectId = ProjectManager.getProjectId();
            console.log(projectRoot.fullPath.substr(10));
        if (projectRoot.fullPath.indexOf("dropbox://") === 0) {
            process.chdir(os.tmpDir() + projectRoot.fullPath.substr(10));
        }
        else
            process.chdir(projectRoot.fullPath);
        if (brackets.fs.existsSync(projectName + ".wgt"))
            brackets.fs.unlinkSync(projectName + ".wgt");
        child_process.exec("web-packaging", function (err, stdout, stderr) {
            console.log(stdout);
            console.log(stderr);
            execDeviceCommand("shell mdkir -p /opt/apps/widgets/test-widgets", function () {
            execDeviceCommand("push " + projectName + ".wgt /tmp/"+ projectName + ".wgt", function(err, stdout, stderr) {
                console.log(stdout);
                console.log(stderr);
                //execDeviceCommand("shell '/usr/bin/wrt-launcher --developer-mode 1 && wrt-installer -iu /opt/apps/widgets/test-widgets/" + projectName + ".wgt && /usr/bin/wrt-launcher --start " + projectId + " --debug --timeout=90'", function (err, stdout, stderr) {
                execDeviceCommand("shell 'unzip -p /tmp/" + projectName + ".wgt > t && unzip -p /opt/usr/apps/widgets/test-widgets/" + projectName + ".wgt> t1 && if [ " + ports[window.device + "." + projectId] + " == undefined ] || ! diff t t1 >/dev/null  ; then cp /tmp/" + projectName + ".wgt" + " /opt/usr/apps/widgets/test-widgets && /usr/bin/wrt-launcher --developer-mode 1 && pkgcmd -s -n " + projectId + " -t wgt && pkgcmd -u -n " + projectId +  " -q -t wgt; pkgcmd -i -q -t wgt -p /opt/apps/widgets/test-widgets/" + projectName + ".wgt && /usr/bin/wrt-launcher --start " + projectId + " --debug --timeout=90 ; else echo port: " + ports[window.device + "." + projectId] + "; fi'", function (err, stdout, stderr) {
                    console.log("got stdout:" + stdout.split("\n").length);
                    stdout.split("\n").forEach (function (line) {
                        console.log("line:" + line);
                        if (line.indexOf("port:") !== -1) {
                            var port = line.split(" ")[1];
                            var Inspector = require("LiveDevelopment/Inspector/Inspector");
                            console.log("got port:" + port);
                            ports[ window.device + "." + projectId ] = port;
                            Inspector.setSocketsGetter(function () {
                                var result = new $.Deferred();
                                console.log("setting up forward " + port);
                                child_process.exec("sdb -s " + window.device + " forward tcp:" + port + " tcp:" + port, function() {
                                    console.log("getting debug url:" + port);
                                    $.getJSON("http://localhost:" + port + "/WidgetDebug", function (data) {
                                        console.log("got debug url:" + data.inspector_url);
                                        result.resolve ([{
                                            webSocketDebuggerUrl:"ws://localhost:" + port +"/devtools/page/1",
                                            url:url,
                                            devtoolsFrontendUrl: "/" + data.inspector_url
                                        }]);
                                    });
                                });
                                return result;
                            });
                            callback(0, port)
                        }
                    })

                });
            });
            });
        })
        return;
    }
    setTimeout(function() {
        var args = [];
        var newHeight = screen.availHeight/2;
        var nwWindow;
        var simulatorPath, questionMarkIndex;
        if (!gui) {
            OpenBrowserWindowIfNeeded(url);
            this( 0 , 1);
            return;
        }
        if (enableRemoteDebugging) {
            args.push('--remote-debugging-port=9222');
            args.push('--no-toolbar');
        }
        nwWindow = gui.Window.get();
        questionMarkIndex =  url.indexOf("?");
        simulatorPath = url.substr(0, questionMarkIndex);
        simulatorPath = simulatorPath.slice(7);
        simulatorPath = simulatorPath.substr(0, simulatorPath.lastIndexOf("/"));
        if (simulatorPath && brackets.platform === "win" && simulatorPath.charAt(0) === "/") {
            simulatorPath = simulatorPath.slice(1);
        }
        (new NativeFileSystem.DirectoryEntry(simulatorPath)).getFile(simulatorPath + "/package.json", {create: true}, function (fileEntry) {
            var packageJson = {
                name: "Brackets",
                main: url
            }
            require("file/FileUtils").writeText(fileEntry, JSON.stringify(packageJson)).done( function () {
            args.push('--allow-file-access-from-files');
            args.push(".");
            liveBrowser = child_process.spawn(process.execPath,  args, {cwd: simulatorPath});
            liveBrowser.on('close', function () {
                liveBrowser = null;
            });
            nwWindow.on('close', function() {
                appshell.app.closeLiveBrowser();
                nwWindow.close(true);
            });
            //Ubuntu 11.10 Unity env
            if ((process.env["XDG_CURRENT_DESKTOP"] && process.env["XDG_CURRENT_DESKTOP"] === "Unity")
                //Ubuntu 11.04 Unity env
                || process.env["DESKTOP_SESSION"] === "gnome")
                newHeight -= (window.outerHeight - window.innerHeight);
            window.resizeTo(window.outerWidth, newHeight);
            nwWindow.moveTo((screen.availWidth - window.outerWidth)/2,
                 screen.availTop + screen.availHeight/2);
            callback(liveBrowser.pid > 0 ? 0: -1, liveBrowser.pid)
            });
        })

    }.bind(callback), 0);
}
function CloseLiveBrowser(callback){
    if (callback && liveBrowser) {
        if (liveBrowser.pid)
            liveBrowser.on('close', function () {
                callback(0);
            });
        else
            $(liveBrowser).bind("beforeunload",  function (){
                callback(0);
            })
    }
    else if (callback)
        callback(-1);
    if (liveBrowser)
        if (liveBrowser.pid)
            process.kill(liveBrowser.pid, "SIGTERM");
        else {
            liveBrowser.close();
            liveBrowser = null;
        }

}
function OpenURLInDefaultBrowser(){
    throw arguments.callee.name
}
function GetCurrentLanguage(){
    return navigator.language
}
function GetApplicationSupportDirectory(){
    var groupName = "Adobe",
        appName = "Brackets";
    if (!window.process) {
        return location.pathname.substr(0, location.pathname.lastIndexOf("/"));
    }
    if (process.platform === "win32")
        return process.env["APPDATA"]+ "\\" + groupName + "\\" + appName;
    else
        return process.env["HOME"]+"/Library/Application Support/"+ groupName
                   + "/" + appName;
}
function ShowOSFolder(){
    throw arguments.callee.name
}
window.require = undefined
