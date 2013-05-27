define(function (require, exports, module) {
    "use strict";
    require("utils/Global");
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
        getDropbox(function (err, dropbox) {
        });
        dropbox.readdir(path.replace("dropbox://", ""), function(error, fileNames, folder, files) {
            this(error, fileNames);
        }.bind(callback));
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
                    //url: function() { return ""; },
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

                //dropbox.authDriver(new Dropbox.Drivers.Redirect({ rememberUser: true}));
                dropbox.authDriver(dropboxOAuthDriver);
                dropbox.authenticate(callback);
        }
        else
            callback(null, dropbox);
    }
    exports.getDropbox = getDropbox;
});
