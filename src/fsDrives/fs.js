define(function (require, exports, module) {
    var httpFs    = require("fsDrives/httpFs"),
        dropboxFs = require("fsDrives/dropboxFs"),
        nodefs    = require("fsDrives/nodeFs"),
        githubFs  = require("fsDrives/githubFs"),
        AppInit   = require("utils/AppInit");
    var CommandManager          = brackets.getModule("command/CommandManager"),
        Commands                = brackets.getModule("command/Commands"),
        Menus                   = brackets.getModule("command/Menus"),  
        FileUtils               = brackets.getModule("file/FileUtils"),
        ExtensionUtils          = brackets.getModule("utils/ExtensionUtils"),
        ProjectManager          = brackets.getModule("project/ProjectManager"),
        Dialogs                 = brackets.getModule("widgets/Dialogs"),
        NativeFileSystem        = require("file/NativeFileSystem").NativeFileSystem,
        ghOpenFolderDialogHtml  = require("text!fsDrives/htmlContent/gh-open-folder-dialog.html");
    var drivers = [httpFs,dropboxFs,githubFs,nodefs],
        fsApis  = ["stat","readdir","readFile","makedir","writeFile"];
    var moduleDir;
    AppInit.appReady(function () {
        ExtensionUtils.loadStyleSheet(module, "css/github.css");
        drivers.forEach(function(fsObject) {
            if (NAME = fsObject["NAME"]) {
                var ID = NAME.split(" ")[1];
                var fileMenu = Menus.getMenu(Menus.AppMenuBar.FILE_MENU);
                CommandManager.register(NAME, ID, loadProject);
                fileMenu.addMenuItem(ID, null, Menus.AFTER,
                        Commands.FILE_OPEN_FOLDER);
            }
        });
        $('body').append($(Mustache.render(ghOpenFolderDialogHtml)));
        $('body').on('mouseover', '.Github-file-row', function(event) {
            $(event.currentTarget).addClass('highlight');
        });
        $('body').on('mouseout', '.Github-file-row', function(event) {
            $(event.currentTarget).removeClass('highlight');
        });
        $('body').on('click', '.Github-file-row', function(event) {
            var PATH =  $(event.currentTarget).data('path');
            constructDialog(PATH);
            console.log("the path is :" + PATH);
        });
    });
    brackets.fs.showOpenDialog = function (allowMultipleSelection, chooseDirectory, title, initialPath, fileTypes, callback) {
        console.log(initialPath);
        console.log(title);
        setTimeout( function (){
            if(initialPath){
                initialPath = initialPath + "://";
                moduleDir = FileUtils.getNativeModuleDirectoryPath(module);
                constructDialog(initialPath);
                Dialogs.showModalDialog("dp-open-folder-dialog").done(function (id) {
                    if (id === 'open') {
                        ProjectManager.openProject();
                    }
                });
            }
            else {
                ShowOpenDialog(callback, allowMultipleSelection, chooseDirectory);
            }
        }, 10);
    }
    function match(initialPath, callback) {
        if (initialPath.indexOf("github://") === 0) {
            if (initialPath.indexOf("github:///") === 0)
                callback(initialPath.replace("github:///",""), githubFs);
            else
                callback(initialPath.replace("github://",""), githubFs);
        }
        else if (initialPath.indexOf("dropbox://") === 0)
            callback(initialPath.replace("dropbox://",""), dropboxFs);
    } 
    function loadProject() {
        var title = this["_name"],
            initialPath = this["_id"].toLowerCase();
        brackets.fs.showOpenDialog(true, false, title, initialPath,
            null, function () {
        });
    }
    function constructDialog(initialPath){
        match(initialPath, function(path, driver) {
        var fileClass = "Github-file-row";
        driver.readdir(path, function(error, files) {
                $('.github-file-rows').empty();
                var len = files.length;
                for (var i = 0; i<len ; i++) {
                    file = files[i];
                    $('.github-file-rows').append(
                        '<tr data-path=' + initialPath +"/"+  file + ' class=' + fileClass  + '><td class="file-icon">' +
                        '<img src="' + moduleDir + '/img/' +  "folder" + '.png"/> ' +
                        "</td><td>" +
                        file +
                        "</td>" +
                        '</tr>');
                }
            });
        });
    }
    fsApis.forEach(function(api) {
        brackets.fs[api] = function () {
            var apiArguments = arguments;
            var apiThis = this;
            drivers.forEach(function(fsObject) {
                if(fsObject.getDriverPath(apiArguments[0])) {
                    apiArguments[0] = fsObject.getDriverPath(apiArguments[0]); 
                    fsObject[api].apply(apiThis, apiArguments);
                }
            });
        };
    });
   exports.constructDialog = constructDialog;
});
