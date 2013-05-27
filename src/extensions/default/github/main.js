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
    'use strict';
    var CommandManager         = brackets.getModule("command/CommandManager"),
        Dialogs                = brackets.getModule("widgets/Dialogs"),
        ProjectManager         = brackets.getModule("project/ProjectManager"),
        DocumentManager        = brackets.getModule("document/DocumentManager"),
        ExtensionUtils         = brackets.getModule("utils/ExtensionUtils"),
        FileUtils              = brackets.getModule("file/FileUtils"),
        Commands               = brackets.getModule("command/Commands"),
        Menu                   = brackets.getModule("command/Menus"),
        githubFs              = brackets.getModule("fsDrives/githubFs");
    var OPEN_MENU_NAME   = "Open Github Project...",
        OPEN_COMMAND_ID  = "github.open";
    var githublib              = require("github"),
        base64lib              = require("lib/base64"),
        underscore             = require("lib/underscore-min");
    var oauthJason             = require("lib/json2"),
        localStorage           = require("lib/localstorage"),
        oauthJso               = require("lib/jso"),
        ghOpenFolderDialogHtml = require("text!htmlContent/gh-open-folder-dialog.html");
    var access_token,
        userUrl = 'https://api.github.com/user?access_token=',
        url = 'https://github.com/login/oauth/authorize',
        githubFolder,
        moduleDir,
        username,
        path,
        repoList;
    function loadGithubProject() {
        githubFs.getGithub(function(token){
            access_token = token;
            performOajax();
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
    function performOajax() {
       if(!window.github) {
           window.github = new Github ({
                token : access_token,
                auth : "oauth"
            });
       }
       var user = github.getUser();
        $.oajax({
            type: "GET",
            url: userUrl+ access_token,
            jso_provider: "github",
            jso_allowia: false,
            dataType: 'json',
            sync : false,
            success: function(data) {
                username = data["login"];
                console.log("the username is :" + username);
                user.userRepos(String(username), function(err, content) {
                    console.log(content);
                    repoList = content;
                    readGithubRepo(repoList, "/");
                    for(var i = 0; i < content.length; i++) {
                        console.log(content[i].html_url);
                        }
                    });
                },
            error: function(jqXHR, textStatus, errorThrown) {
                alert(jqXHR.status);
                alert(errorThrown); 
            }
        });
    }
    function readGithubRepo(repoList, path) {
        console.log("the repoList is :");
        console.log(repoList);
        githubFolder = path;
        displayGithubPath(path);
        var folder = new Array();
        var repo = new Array()
        for(var i = 0 ; i < repoList.length; i++) {
            console.log(repoList[i].html_url);
            folder[i] = repoList[i].html_url;
        }
        $('.github-user').html('Github user: ' + username);
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
    function readGithubFolder(github, path) {
        path = path.replace("https://github.com", "github:/");
        ProjectManager.openProject(path);
        console.log("the path is :" + path);
    }
    /**
     * Display bread crumbs for the path in the Open Folder dialog
     * @param path
     */
    function displayGithubPath(path) {
        var arr = path.split("/");
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
    function initialGithub() {  
        var cmdGithub, projMenu;
        ExtensionUtils.loadStyleSheet(module, "css/github.css");
        $('body').append($(Mustache.render(ghOpenFolderDialogHtml)));
        projMenu  = Menu.getMenu(Menu.AppMenuBar.FILE_MENU);
        cmdGithub = CommandManager.register(OPEN_MENU_NAME,
                    OPEN_COMMAND_ID, loadGithubProject);
        projMenu = Menu.getMenu(Menu.AppMenuBar.FILE_MENU);
                    projMenu.addMenuItem(OPEN_COMMAND_ID, "", Menu.LAST_IN_SECTION, 
                    Menu.MenuSection.FILE_LIVE);
        moduleDir = FileUtils.getNativeModuleDirectoryPath(module);
            $('body').on('mouseover', '.file-row', function(event) {
                $(event.currentTarget).addClass('highlight');
            });

            $('body').on('mouseout', '.file-row', function(event) {
                $(event.currentTarget).removeClass('highlight');
            });
            $('body').on('click', '.file-row', function(event) {
                readGithubFolder(github, $(event.currentTarget).data('path'));
            });
        }
    initialGithub();
});
