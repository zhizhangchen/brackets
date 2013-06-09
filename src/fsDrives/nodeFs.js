define(function (require, exports, module) {
    "use strict";
    require("utils/Global");
    exports.getDriverPath = function(path, nodeFs) {
        if (nodeFs) 
            return path;
        else
            return false;
    }
    exports.stat = function(path, callback) {
        nodeFs.stat(path, function (err, stats) {
            err = _nodeErrorToBracketsError(err);
            if (!err)
                stats.mtime = new Date();
            this(err, stats);
        }.bind(callback));
    }
    exports.readdir = function(path, callback) {
        nodeFs.readdir(path, callback);
    }
    exports.makedir = function(path, permissions, callback) {
        nodeFs.mkdir(path, callback);   
    }
    exports.readFile = function(path, encoding, callback) {
        nodeFs.readFile(path, encoding, function (err, data) {
            err = _nodeErrorToBracketsError(err);
            this(err, data);
        }.bind(callback));
    }
    exports.writeFile = function(path, data, encoding, callback) {
        nodeFs.writeFile(path, data, encoding, function (err) {
            callback(_nodeErrorToBracketsError(err));
        });
    }
});
