/*
 * The MIT License (MIT)
 * Copyright (c) 2012 Intel Corporation. All rights reserved.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

/** extension to generate & validate cache manifest files */

/**
 *
 */
define(function (require, exports, module) {
    "use strict";
    require("utils/Global");
    var NAME  = "Open Github Project...";
    var repo,
        //repoName,
        userName,
        dirLocation,
        moduleDir,
        PATH = "/",
        repoList,
        branch = "master",
        access_token,
        githubPrefix = "https://github.com/";
    var githublib              = require("extensions/default/github/github"),
        base64lib              = require("extensions/default/github/lib/base64"),
        underscore             = require("extensions/default/github/lib/underscore-min");
    var oauthJason             = require("extensions/default/github/lib/json2"),
        localStorage           = require("extensions/default/github/lib/localstorage"),
        oauthJso               = require("extensions/default/github/lib/jso");
    var Dialogs                = brackets.getModule("widgets/Dialogs"),
        ExtensionUtils         = brackets.getModule("utils/ExtensionUtils"),
        ghOpenFolderDialogHtml = require("text!fsDrives/htmlContent/gh-open-folder-dialog.html");
    var userUrl = 'https://api.github.com/user?access_token=';
    var splitPath = function(path) {
        var subPath = path.split("/");
        return subPath;
    }
    var isRepo = function(path) {
        var subPath = splitPath(path);
        dirLocation = subPath[0].length + subPath[1].length + 2;
        var url =  userName + "/" + subPath[1];
        if (url === path || (url + '/') === path || ("/" + url) === path)
            return true;
        else 
            return false;
    }
    var isRoot = function(path) {
        if(path === "" || path === userName) 
            return true;
        else
            return false;
    }
    function getDriverPath(path, nodeFs) {
        if (path.indexOf("github://") ===0)
            return path.replace("github://","");
        else
            return false;
    }
    function stat(path, callback) {
        getGithub(function(token){
            githubStat(path, callback);
        });
    }
    function readdir(path, callback) {
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
        var repoName = subPath[1]; 
        console.log("the repoName is :" + repoName);
        console.log("the userName is: " + userName);
        repo = github.getRepo(userName, repoName);
        if (isRepo(path)) {
            if (repo !== null) {
                callback (brackets.fs.NO_ERROR, {
                isDirectory: true,
                isFile: false,
                mtime: new Date()});
            } else {
                callback (brackets.fs.ERR_NOT_FOUND, null);
            }
        }
        else {
                if(path.slice(-1) === "/")
                    path = path.substring(dirLocation, path.length - 1);
                else
                    path = path.substring(dirLocation, path.length);
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
        if (!isRoot(path)) {
            if (isRepo(path)) {
                path = path.substring(dirLocation, path.length);
            }
            else {
                if(path.slice(-1) === "/")
                    path = path.substring(dirLocation, path.length - 1);
                else
                    path = path.substring(dirLocation, path.length);
            }
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
        else {
            getGithub(function(token) {
                access_token = token;
                performOajax(function(userName) {
                    console.log("the username is :" + userName);
                    var user = github.getUser();
                    user.userRepos(String(userName), function(err, content) {
                        if (content == null) {
                            err = brackets.fs.ERR_NOT_FOUND;
                            callback (err, null);
                        }
                        else {
                            console.log(content);
                            repoList = content;
                            for(var i = 0; i < content.length; i++) {
                                console.log(content[i].html_url);
                            }
                            console.log("the repoList is :");
                            console.log(repoList);
                            displayGithubPath(PATH);
                            var name = new Array,
                                path,
                                isFolder,
                                isFile,
                                repo = new Array();
                            var len = repoList.length;
                            for(var i = 0 ; i < len; i++) {
                                path = repoList[i].html_url;
                                name[i] = path.replace(githubPrefix,"");
                                githubStat(getDriverPath(path.replace("https://github.com", "github:/")), function(stat, files){
                                isFolder = files.isDirectory;
                                isFile = files.isFile;
                                });
                                repo[i] = new file(name, path, isFile, isFolder); 
                            }
                        callback(null, name);
                        }
                    });
                });
            });
        }
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
            if (!window.github)  
            window.github = new Github ({
                token : access_token,
                auth : "oauth"
            });
            access_token = jso_getToken("github" ,["eepo","user"]);
            ensureToken();
            callback(access_token);
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
    /**
     * Read repo of Github and populate the Open Folder dialog with the list of files
     * @param github
     * @param path
     * @param callback
     */
    /**
     * Load Tizen project extension.
     */
    function performOajax(callback) {
       if(!window.github) {
           window.github = new Github ({
                token : access_token,
                auth : "oauth"
            });
       }
        $.oajax({
            type: "GET",
            url: userUrl+ access_token,
            jso_provider: "github",
            jso_allowia: false,
            dataType: 'json',
            sync : false,
            success: function(data) {
                userName = data["login"];
                callback(userName);
                },
            error: function(jqXHR, textStatus, errorThrown) {
                alert(jqXHR.status);
                alert(errorThrown); 
            }
        });
    }
    function readGithubRepo(repoList, PATH) {
        $('.github-user').html('Github user: ' + userName);
        $('.github-file-rows').empty();
        var len = folder.length;
        for (var i = 0; i<len ; i++) {
            repo[i] = folder[i].substring((folder[i].lastIndexOf("/"))+1);
            $('.github-file-rows').append('<tr data-path=' + folder[i] +  ' class="file-row"' +
                    '><td class="file-icon">' +
                    '<img src= ' + moduleDir + "/img/" +  "folder.png"+'> '+'</td>' +'<td>'+
                    repo[i] +
                    '</td>');
        }
        Dialogs.showModalDialog("gh-open-folder-dialog");
    }
    /**
     * Display bread crumbs for the path in the Open Folder dialog
     * @param path
     */
    function displayGithubPath(PATH) {
        var arr = PATH.split("/");
        var len  = arr.length;
        if (arr[len - 1] == "") {
            arr.pop();
            len = len - 1;
        }
        var html = "";
        var fullPath = "";
        for (var i=0; i<len; i++) {
            var fullPath = fullPath + arr[i] + '/';
            html = html +
                (i==0 ? "" : " / ") + '<a href="#" class="github-path-link" data-path="' + fullPath + '">' + ( i==0 ? 'root' : arr[i] ) + '</a>';
        }
        $('.github-path').html(html);
    }
    function file (name, path, isFile, isFolder) {
        this.name = name;
        this.path = path;
        this.isFile = isFile;
        this.isFolder = isFolder;
    }
    exports.getDriverPath = getDriverPath;
    exports.getGithub = getGithub;
    exports.doJsoConfigure = doJsoConfigure;
    exports.doOauth = doOauth;
    exports.NAME = NAME;
    exports.readdir = readdir;
});
