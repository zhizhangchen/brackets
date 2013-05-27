define(function (require, exports, module) {
    "use strict";
    require("utils/Global");
    var repo,
        repoName,
        userName,
        dirLocation,
        branch = "master",
        access_token,
        githubPrefix = "github://";
    var githublib              = require("extensions/default/github/github"),
        base64lib              = require("extensions/default/github/lib/base64"),
        underscore             = require("extensions/default/github/lib/underscore-min");
    var oauthJason             = require("extensions/default/github/lib/json2"),
        localStorage           = require("extensions/default/github/lib/localstorage"),
        oauthJso               = require("extensions/default/github/lib/jso");
    var splitPath = function(path) {
        var subPath = path.split("/");
        return subPath;
    }
    var isRepo = function(path) {
        var subPath = splitPath(path);
        dirLocation = subPath[0].length + subPath[1].length + 2;
        var url =  userName + "/" + repoName;
        if (url === path || (url + '/') === path)
            return true;
        else 
            return false;
    }
    exports.getDriverPath = function(path, nodeFs) {
        if (path.indexOf("github://") ===0)
            return path.replace("github://","");
        else
            return false;
    }
    exports.stat = function(path, callback) {
        getGithub(function(token){
            githubStat(path, callback);
        });
    }
    exports.readdir = function(path, callback) {
        readGithubDir(path, callback);
    }
    exports.makedir = function(path, permissions, callback) {
        MakeDir(path, permissions, callback);
    }
    exports.readFile = function(path, encoding, callback) {
        readGithubFile(path, encoding, callback);
    }
    exports.writeFile = function(path, data, encoding, callback) {
        writeGithubFile(path,data,encoding,callback);
    }
    var githubStat = function(path, callback) {
        var subPath = splitPath(path);
        userName = subPath[0]; 
        repoName = subPath[1]; 
        console.log("the repoName is :" + repoName);
        console.log("the userName is: " + userName);
        repo = github.getRepo(userName, repoName);
        if (isRepo(path)) {
            if (repo !== null) {
                callback (brackets.fs.NO_ERROR, null);
            } else {
                callback (brackets.fs.ERR_NOT_FOUND, null);
            }
        }
        else {
            path = path.substring(dirLocation);
            repo.getTree(branch+"?recursive=true", function (err, tree) {
                var file = _.select(tree, function(file) {
                    return file.path === path;
                })[0];
                if (file) {
                    if (file.type === "tree") {
                    callback (brackets.fs.NO_ERROR, {
                        isDirectory: function () {
                        return true;
                        },
                        isFile: function () {
                        return false;
                                },
                        mtime: new Date()
                            });
                        }
                    else {
                        callback (brackets.fs.NO_ERROR, {
                                isDirectory: function () {
                                        return false;
                                        },
                                        isFile: function () {
                                return true;
                                        },
                                mtime: new Date()
                                    });
                        }
                    }
                else {
                    callback (brackets.fs.ERR_NOT_FOUND, null);
                }
            });
        }
    }
    var readGithubDir = function(path, callback) {
        if (isRepo(path)) {
            path = path.substring(dirLocation, path.length);
        }
        else
            path = path.substring(dirLocation, path.length-1);
        repo.getSha(branch, path, function (err, res) {
            if (res == null)
            {
                err = brackets.fs.ERR_NOT_FOUND;
                callback (err, null);
            }
            else {
                repo.getTree(res, function (err, result) {
                    if (!err)
                    {
                        var fileList = new Array();
                        for(var i = 0;i< result.length; i++) {
                           fileList[i] = result[i].path;
                        }
                        console.log("the fileList is : " +fileList);
                        console.log(fileList);
                        callback (brackets.fs.NO_ERROR, fileList);
                    }
                    else {
                        callback (brackets.fs.ERR_NOT_FOUND, null);
                    }
                });
            }
        });
    }
    var readGithubFile = function(path, encoding, callback) {
        path = path.substring(dirLocation, path.length);
        repo.getSha(branch, path, function (err, res) {
            if (res == null)
            {
                err = brackets.fs.ERR_NOT_FOUND;
                callback (err, null);
            } 
            else {
                repo.getBlob(res, function (err, data) {
                    if (data == true)
                    {
                        err = brackets.fs.ERR_NOT_FOUND;
                        callback (err, null);
                    } else {
                        err = brackets.fs.NO_ERROR;
                        callback (err, data);
                    }

                });
            }
        });
    }
    var writeGithubFile = function(path, data, encoding, callback) {
        repo.write(branch, path.substring(path.lastIndexOf("/")+1), data, "yunpeng write file test",        function (err) {
            if(!err)
            return callback (brackets.fs.NO_ERROR);
            else   
            callback(brackets.fs.NOT_FOUND_ERROR);
        });
    }
    var MakeDir = function(path, permissions, callback){
        var data = "# Ignore everything in this directory\n" + "*\n" + "# Except this file\n" + "!.gitignore";
        repo.write(branch, path + "/.gitignore", data, "make dir", function (err) {
        return callback (brackets.fs.ERR_CANT_WRITE);
        });
        callback (brackets.fs.NO_ERR);
    }
    function getGithub(callback) {
        access_token = jso_getToken("github" ,["repo","user"]);
        var url = 'https://github.com/login/oauth/authorize';
        doJsoConfigure(url);
        if(!access_token) {
            var Dialogs                = brackets.getModule("widgets/Dialogs");
            var $dlg = $("." + Dialogs.DIALOG_ID_INFO + ".template")
                .clone()
                .removeClass("template")
                .addClass("instance")
                .appendTo(window.document.body);
                $(".dialog-title", $dlg).html("Welcome to use Github as your project storage");
                $(".dialog-message", $dlg).html("A new window will be opened for Github now. Please login and click 'Allow' to allow us to use your github as a project storage. Don't forget to close the window after allowing");
                $dlg.one("click", ".dialog-button", function (e) {
                    $dlg.modal(true).hide();
                    console.log(access_token);
                    doOauth(function(token){
                        window.github = new Github ({
                            token: token,
                            auth : "oauth"
                        });
                        ensureToken();
                        callback(token);
                    });
                });
            $dlg.modal({
            backdrop: "static",
            show: true,
            keyboard: true
            });
        }
        else {
            if (!window.github) { 
            window.github = new Github ({
                token : access_token,
                auth : "oauth"
            });
            ensureToken();
            callback(access_token);
        }
        else { 
            ensureToken();
            callback(access_token);
            }
        }
    }
    function doOauth(callback) {
        var client_id = "461a47b142a0daac99bd",
            client_secret = "9adb3fe4a3d471c38541ed785add8fca466e41ee",
            forTokenUrl = "https://api.github.com/user#access_token=",
            url = 'https://github.com/login/oauth/authorize',
            getTokenUrl = "https://github.com/login/oauth/access_token",
            code,
            state,
            win;
        jso_registerRedirectHandler(function(url) {
            var win = window.open(url); 
            setTimeout(function checkClose() {
                if (win.closed) {
                    var uri = window.authURL;
                    code = uri.substring((uri.indexOf("code=")+5),uri.indexOf("&state"));
                    state = uri.substring(uri.indexOf("state=")+6);
                    getTokenUrl = getTokenUrl+ "?client_id=" + client_id + "&client_secret=" + client_secret + "&code=" + code;
                    console.log(getTokenUrl);
                    $.get(getTokenUrl, function(data , status){
                        access_token = data.substring(13, data.indexOf("&"));
                        jso_checkfortoken('github', forTokenUrl+access_token,function() {
                            console.log("the forTokenUrl+access_token url is " + forTokenUrl+access_token);
                            callback(access_token);
                        });
                    });
                }
                else
                    setTimeout(checkClose, 100)
            }, 100);
        });
        ensureToken();
    }
    function ensureToken() {
        jso_ensureTokens({
            "github": ["repo", "user"],
        });
    }
    function doJsoConfigure(url) {
        jso_configure({
            "github" :{
                client_id: "461a47b142a0daac99bd",
                authorization: url, 
                scope : ["repo", "user"],
                isDefault : true
            },
        });
    }
    exports.getGithub = getGithub;
    exports.doJsoConfigure = doJsoConfigure;
    exports.doOauth = doOauth;
});
