define(function (require, exports, module) {
    "use strict";
    require("utils/Global");
    var NAME  = "Open Dropbox Folder...";
    var dropboxFiles,
        dropboxFolder,
        moduleDir,
        NativeFileSystem        = require("file/NativeFileSystem").NativeFileSystem,
        fs                      = require("fsDrives/fs"),
        FileUtils               = brackets.getModule("file/FileUtils"),
        Dialogs                 = brackets.getModule("widgets/Dialogs");
    var isRoot = function(path) {
        return false
        if(path === "") 
            return true;
        else
            return false;
    }
    function _getDropboxProjectFolder(folderName, callback) {
        var getTempRootDirectory = function(callback) {
            if (os) {
                callback(new NativeFileSystem.DirectoryEntry(os.tmpDir()));
            }
            else {
                window.BlobBuilder = window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder;
                window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
                requestFileSystem(window.TEMPORARY, 20*1024*1024, function(filesystem) {
                    callback(filesystem.root);
                })
            }
        }
        getTempRootDirectory(function (rootEntry) {
            rootEntry.getDirectory(PROJECTS_TEMP_FOLDER,{create:true},  function (dirEntry) {
                dirEntry.getDirectory(folderName, {create:true}, callback);
            })
        })
    }
    exports.getDriverPath = function(path, nodeFs) {
        if (path.indexOf("dropbox://") === 0) 
            return path.replace("dropbox://", "");
        else
            return false;
    }
    exports.stat = function(path, callback) {        
        getDropbox(function (err, dropbox) {
        });
        dropbox.stat(path, function(err, stats) {
            if (!err) {
                err = brackets.fs.NO_ERROR;
                stats.isDirectory =  function () {
                    return this.isFolder;
                }.bind(stats)
                stats.isFile =  function () {
                    return this.isFile;
                }.bind($.extend({}, stats))
                stats.mtime = stats.modifiedAt;
            }
            if (err && err.status === 404) {
                err = brackets.fs.ERR_NOT_FOUND;
            }
            this(err, stats);
        }.bind(callback));
    }
    exports.readdir = function(path, callback) {
        if (isRoot(path)) {
            getDropbox(function (error, client) {
                if (error) {
                    showMessage('Authentication error: ' + error);
                }
                var userName;
                client.getUserInfo(function(error, userInfo) {
                    if (error) {
                        showMessage(error);
                    }
                    userName = userInfo.name;
                });
                dropboxFolder = path;
                console.log("Dropbox Folder: " + dropboxFolder);
                $('.dropbox-file-rows').empty();
                dropbox.readdir(path, function(error, fileNames, folder, files) {
                    if (error) {
                        alert('Error: ' + error);
                        return;
                    }
                    dropboxFiles = files;
                    var len = files.length;
                    var file = new Array();
                    var filePath = new Array();
                    console.log('readdir len:' + len);
                    console.log($('#dpRows'));
                    callback(error , files);
                });
                Dialogs.showModalDialog("gh-open-folder-dialog").done(function (id) {
                    if (id === 'open') {
                        createProjectFiles();
                    }
                });
            });
        }
        else {
            getDropbox(function (err, dropbox) {
                dropbox.readdir(path, function(error, fileNames, folder, files) {
                    this(error, fileNames);
                }.bind(callback));
            });
        }
    }
    exports.makedir = function(path, permissions, callback) {
        getDropbox(function (err, dropbox) {
        });
        dropbox.mkdir(path, function (err, stat) {
            callback && callback(_dropboxErrorToBracketsError(err));
        });
    }
    exports.readFile = function(path, encoding, callback) {
        getDropbox(function (err, dropbox) {
        });
        dropbox.readFile(path, {binary:true}, function (err, data) {
            err = _dropboxErrorToBracketsError(err);
            data = data;
            this(err, data);
        }.bind(callback));
    }
    exports.writeFile = function (path, data, encoding, callback) {
        getDropbox(function (err, dropbox) {
        });
        dropbox.writeFile(path, data, {binary:true}, function (err) {
            callback(_dropboxErrorToBracketsError(err))
        });
    }
    function getDropbox(callback) {
        if (!window.dropbox) {
                var Dialogs             = require("widgets/Dialogs");
                var dropboxOAuthDriver = $.extend({}, new Dropbox.Drivers.Redirect ({rememberUser: true}), {
                    url: function() { return "";},
                    doAuthorize: function(authUrl, token, tokenSecret, callback) {
                        var $dlg = $("." + Dialogs.DIALOG_ID_INFO + ".template")
                            .clone()
                            .removeClass("template")
                            .addClass("instance")
                            .appendTo(window.document.body);
                        $(".dialog-title", $dlg).html("Welcome to use Dropbox as your project storage");
                        $(".dialog-message", $dlg).html("A new window will be opened for Dropbox now. Please login and click 'Allow' to allow us to use your dropbox as a project storage. Don't forget to close the window after allowing");
                        $dlg.one("click", ".dialog-button", function (e) {
                            $dlg.modal(true).hide();
                            var w = window.showModalDialog(authUrl, null, "dialogWidth:950; dialogHeight:550;dialogLeft:300");
                            callback(token);
                        });
                        $dlg.modal({
                            backdrop: "static",
                            show: true,
                            keyboard: true
                        });
                    }
                });

                window.dropbox = new Dropbox.Client({
                    key: "xbfa6vr2n1nk082", secret: "dze5e13g0j4vf07", sandbox: true
                });

                dropbox.authDriver(dropboxOAuthDriver);
                dropbox.authenticate(callback);
        }
        else
            callback(null, dropbox);
    }
    /**
     * Open a dialog to select a Dropbox folder
     */
    function selectDropboxFolder() {
        dropboxFs.getDropbox(function (error, client) {
            if (error) {
                showMessage('Authentication error: ' + error);
            }
            client.getUserInfo(function(error, userInfo) {
                if (error) {
                    showMessage(error);
                }
                $('.dropbox-user').html('Dropbox user: ' + userInfo.name);
            });
            readDropboxFolder(dropbox, "/");
            Dialogs.showModalDialog("dp-open-folder-dialog").done(function (id) {
                if (id === 'open') {
                    createProjectFiles();
                }
            });
        });
    }
    function readDropboxFolder(dropbox, path) {
        dropboxFolder = path;
        console.log("Dropbox Folder: " + dropboxFolder);
        $('.github-file-rows').empty();
        dropbox.readdir(path, function(error, fileNames, folder, files) {
            if (error) {
                alert('Error: ' + error);
                return;
            }
            dropboxFiles = files;
            var len = files.length;
            var file;
            console.log('readdir len:' + len);
            console.log($('#dpRows'));
            for (var i = 0; i<len ; i++) {
                file = files[i];
                console.log(moduleDir + '/img/' +  (file.isFile ? "file" : "folder" ) + '.png');
                $('.github-file-rows').append(
                    '<tr data-path=' + file.path + (file.isFolder ? ' class="Dropbox-folder-row"' : '') + '><td class="file-icon">' +
                    '<img src="' + moduleDir + '/img/' +  (file.isFile ? "file" : "folder" ) + '.png"/> ' +
                    "</td><td>" +
                    file.name +
                    "</td>" +
                    '</tr>');
            }
        });
    }
    function initialize() {
       /*
        ExtensionUtils.loadStyleSheet(module, "css/dropbox.css");

        $('body').append($(Mustache.render(dpOpenFolderDialogHtml)));

        // Register commands
        CommandManager.register(OPEN_MENU_NAME, OPEN_COMMAND_ID, selectDropboxFolder);

        // Add menus
        var fileMenu = Menus.getMenu(Menus.AppMenuBar.FILE_MENU);
        fileMenu.addMenuItem(OPEN_COMMAND_ID, "", Menus.AFTER,
                Commands.FILE_OPEN_FOLDER);
                */
        var dropboxPrefix = NAME.split(" ")[1].toLowerCase() + "://";
        $('body').on('mouseover', '.Dropbox-file-row', function(event) {
            $(event.currentTarget).addClass('highlight');
        });

        $('body').on('mouseout', '.Dropbox-file-row', function(event) {
            $(event.currentTarget).removeClass('highlight');
        });

        $('body').on('click', '.Dropbox-file-row', function(event) {
             fs.constructDialog(dropboxPrefix + $(event.currentTarget).data('path'));
            //readDropboxFolder(dropbox, $(event.currentTarget).data('path'));
        });

        $('body').on('click', '.dropbox-path-link', function(event) {
            event.stopImmediatePropagation();
            event.preventDefault();
            fs.constructDialog(dropboxPrefix + $(event.currentTarget).data('path'));
            //readDropboxFolder(dropbox, $(event.currentTarget).data('path'));
        });
        $('body').on('click','#new-dropbox-folder', function () {
            var newFolder= $("<td><input/></td>");
            var primaryButton = $('.dialog-button.primary');
            $('.dropbox-file-rows').append($('<tr><td class="file-icon">' +
                '<img src="' + moduleDir + '/img/folder.png"/> ' +
                "</td>" +
                '</tr>').append(newFolder).append('<td/>').append('<td/>'));
            newFolder.find('input').val("Untitled").focus(function () {
                primaryButton.removeClass('primary');
            }).focus().bind("blur keydown", function (e) {
                var code = (e.keyCode ? e.keyCode : e.which);
                if (code && code !== 13)
                    return;
                primaryButton.addClass('primary');
                brackets.fs.makedir("dropbox://" + dropboxFolder + "/" + $(this).val(), null,  function () {
                    fs.constructDialog(dropboxPrefix + dropboxFolder);
                    //readDropboxFolder(dropbox, dropboxFolder);
                });
            });


        });
        $('body').on('click','#delete-dropbox-folder', function () {
            dropbox.remove(dropboxFolder, function (){
                fs.constructDialog($(".dropbox-path-link").last().prev().data('path'));
                //readDropboxFolder(dropbox, $(".dropbox-path-link").last().prev().data('path'));
            });
        });
    }

    /**
     * Iterate through the files in the selected Dropbox folder. For each Dropbox file, we create a file in the
     * current Brackets project. The files will be Lazy loaded from Dropbox (they will only be loaded when selected
     * in the project tree)
     */
    function createProjectFiles() {
        var len  = dropboxFiles.length;
        _getDropboxProjectFolder(dropboxFolder.substr(1), function (dirEntry) {
            for (var i=0; i<len; i++) {
                createProjectFile(dirEntry, dropboxFiles[i]);
            }
        }, onError);
        ProjectManager.openProject("dropbox://" + dropboxFolder);
    }
    exports.getDropbox = getDropbox;
    exports.NAME = NAME;
});
