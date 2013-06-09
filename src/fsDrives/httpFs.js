define(function (require, exports, module) {
    "use strict";
    var dropboxHandler = function(path) {
        if(path.indexOf("dropbox://") === 0)
            return true;
        else
            return false;
    }
    var githubHandler = function(path) {
        if (path.indexOf("github://") === 0)
            return true;
        else
            return false;
    }
    exports.getDriverPath = function(path, nodeFs) {
        if (dropboxHandler(path) || nodeFs || githubHandler(path)) {
            return false;
        }
        else {
            return path;
        }
    }
    require("utils/Global");
    exports.stat = function (path, callback) {
        $.ajax({
            url: path,
            type: "HEAD",
            dataType: "html",
            error: function( jqXHR, textStatus, errorThrown) {
                if (jqXHR.status === 403) {
                    this.callback(brackets.fs.NO_ERROR, {
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
                    console.warn("stat " + path + " " + textStatus + ": " + errorThrown);
                    this.callback(brackets.fs.ERR_NOT_FOUND);
                }
            }.bind({path: path, callback:callback}),
            success: function(data, textStatus, jqXHR){
                this(brackets.fs.NO_ERROR, {
                    isDirectory: function () {
                        return this.getResponseHeader("IsDirectory");
                    }.bind(jqXHR),
                    isFile: function () {
                        return !this.getResponseHeader("IsDirectory");
                    }.bind(jqXHR),
                    mtime: new Date(jqXHR.getResponseHeader("Last-Modified"))
                });
            }.bind(callback)
        });
    }
    exports.readdir = function(path, callback) {
        $.ajax({
            url: path + "/manifest.json",
            dataType: 'json',
            data: '{}',
            headers: {
                Accept : "text/json; charset=utf-8"
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("getting " + path + " failed:" + errorThrown);
            },
            success: function (data, textStatus, jqXHR) {
                var err = brackets.fs.NO_ERROR;
                var files;
                if (jqXHR.status === 404)
                    err = brackets.fs.ERR_NOT_FOUND;
                if (data) {
                    files = [];
                    $(data).find('tr > td > a').each(function (i, link) {
                        if ($(link).text() !== "Parent Directory")
                            files.push($(link).attr('href'));
                    })
                }
                this(err, data);
            }.bind(callback)
        });
    }
    exports.makedir = function(path, permissions, callback) {
        callback(brackets.fs.ERR_CANT_WRITE);
    }
    exports.readFile = function(path, encoding, callback) {
        $.get(path, function (data, textStatus, jqXHR) {
            var err = brackets.fs.NO_ERROR;
            if (jqXHR.status === 404)
                err = brackets.fs.ERR_NOT_FOUND;
            this(err, data);
        }.bind(callback), "html")
    }
    exports.writeFile = function(path, data, encoding, callback) {
        callback(brackets.fs.NO_ERROR);
    }
});
