define(function (require, exports, module) {
    var httpFs    = require("fsDrives/httpFs"),
        dropboxFs = require("fsDrives/dropboxFs"),
        nodefs    = require("fsDrives/nodeFs"),
        githubFs  = require("fsDrives/githubFs"),
        fsApis = ["stat","readdir","readFile","makedir","writeFile"];
    var drivers = [httpFs,dropboxFs,githubFs,nodefs];
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
});
