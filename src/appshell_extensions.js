/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
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
 * 
 */ 

// This is the JavaScript code for bridging to native functionality
// See appshell_extentions_[platform] for implementation of native methods.
//
// Note: All file native file i/o functions are synchronous, but are exposed
// here as asynchronous calls. 

/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, forin: true, maxerr: 50, regexp: true */
/*global define, native */

var appshell;
var gui = require('nw.gui');
var child_process = require('child_process');
if (!appshell) {
    appshell = {};
}
if (!appshell.fs) {
    appshell.fs = require('fs');
    appshell.fs.showOpenDialog = function (
                allowMultipleSelection,
                chooseDirectories,
                title,
                initialPath,
                fileTypes, callback) {
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
    
}
if (!appshell.app) {
    appshell.app = {};
}
(function () {    
    // Error values. These MUST be in sync with the error values
    // at the top of appshell_extensions_platform.h.
    
    /**
     * @constant No error.
     */
    appshell.fs.NO_ERROR                    = 0;
    
    /**
     * @constant Unknown error occurred.
     */
    appshell.fs.ERR_UNKNOWN                 = 1;
    
    /**
     * @constant Invalid parameters passed to function.
     */
    appshell.fs.ERR_INVALID_PARAMS          = 2;
    
    /**
     * @constant File or directory was not found.
     */
    appshell.fs.ERR_NOT_FOUND               = 3;
    
    /**
     * @constant File or directory could not be read.
     */
    appshell.fs.ERR_CANT_READ               = 4;
    
    /**
     * @constant An unsupported encoding value was specified.
     */
    appshell.fs.ERR_UNSUPPORTED_ENCODING    = 5;
    
    /**
     * @constant File could not be written.
     */
    appshell.fs.ERR_CANT_WRITE              = 6;
    
    /**
     * @constant Target directory is out of space. File could not be written.
     */
    appshell.fs.ERR_OUT_OF_SPACE            = 7;
    
    /**
     * @constant Specified path does not point to a file.
     */
    appshell.fs.ERR_NOT_FILE                = 8;
    
    /**
     * @constant Specified path does not point to a directory.
     */
    appshell.fs.ERR_NOT_DIRECTORY           = 9;
 
    /**
     * @constant Specified file already exists.
     */
    appshell.fs.ERR_FILE_EXISTS             = 10;
 
    /**
     * Display the OS File Open dialog, allowing the user to select
     * files or directories.
     *
     * @param {boolean} allowMultipleSelection If true, multiple files/directories can be selected.
     * @param {boolean} chooseDirectory If true, only directories can be selected. If false, only 
     *        files can be selected.
     * @param {string} title Tile of the open dialog.
     * @param {string} initialPath Initial path to display in the dialog. Pass NULL or "" to 
     *        display the last path chosen.
     * @param {Array.<string>} fileTypes Array of strings specifying the selectable file extensions. 
     *        These strings should not contain '.'. This parameter is ignored when 
     *        chooseDirectory=true.
     * @param {function(err, selection)} callback Asynchronous callback function. The callback gets two arguments 
     *        (err, selection) where selection is an array of the names of the selected files.
     *        Possible error values:
     *          NO_ERROR
     *          ERR_INVALID_PARAMS
     *
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    appshell.app.quit = function () {
        gui.App.Quit();
    };
 
    /**
     * Abort a quit operation
     */
    appshell.app.abortQuit = function () {
        process.abort();
    };

    /**
     * Invokes developer tools application
     */
    function ShowDeveloperTools(){alert("ShowDeveloperTools")};
    appshell.app.showDeveloperTools = function () {
        ShowDeveloperTools();
    };

    /**
     * Return the number of milliseconds that have elapsed since the application
     * was launched. 
     */
    appshell.app.getElapsedMilliseconds = function () {
        return process.uptime() * 1000;
    }
    
    /**
     * Open the live browser
     *
     * @param {string} url
     * @param {boolean} enableRemoteDebugging
     * @param {function(err)} callback Asynchronous callback function with one argument (the error)
     *        Possible error values:
     *          NO_ERROR
     *          ERR_INVALID_PARAMS - invalid parameters
     *          ERR_UNKNOWN - unable to launch the browser
     *          ERR_NOT_FOUND - unable to find a browers to launch
     *
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    appshell.app.openLiveBrowser = function (url, enableRemoteDebugging, callback) {
        // enableRemoteDebugging flag is ignored on mac
        setTimeout(function() {
            var args = [];
            if (enableRemoteDebugging) {
                args.push('--remote-debugging-port=9222');
                args.push('--no-toolbar');
            }
            args.push("--url="+url);
            var newNw = child_process.spawn(process.execPath, args); 
            callback(newNw.pid > 0 ? 0: -1, newNw.pid)
        }, 0);
    };
    
    /**
     * Attempts to close the live browser. The browser can still give the user a chance to override
     * the close attempt if there is a page with unsaved changes. This function will fire the
     * callback when the browser is closed (No_ERROR) or after a three minute timeout (ERR_UNKNOWN). 
     *
     * @param {function(err)} callback Asynchronous callback function with one argument (the error)
     *        Possible error values:
     *          NO_ERROR (all windows are closed by the time the callback is fired)
     *          ERR_UNKNOWN - windows are currently open, though the user may be getting prompted by the 
     *                      browser to close them
     *
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    function CloseLiveBrowser(){alert("CloseLiveBrowser")};
    appshell.app.closeLiveBrowser = function (callback) {
        CloseLiveBrowser(callback);
    };
 
    /**
     * Open a URL in the default OS browser window. 
     *
     * @param {function(err)} callback Asynchronous callback function with one argument (the error)
     * @param {string} url URL to open in the browser.
     *
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    function OpenURLInDefaultBrowser(){alert("OpenURLInDefaultBrowser")};
    appshell.app.openURLInDefaultBrowser = function (callback, url) {
        OpenURLInDefaultBrowser(callback, url);
    };
 
    /**
     * Return the user's language per operating system preferences.
     */
    function GetCurrentLanguage(){ return navigator.language};
    Object.defineProperty(appshell.app, "language", {
        writeable: false,
        get : function() { return GetCurrentLanguage(); },
        enumerable : true,
        configurable : false
    });
 
    /**
     * Open the extensions folder in an OS file window.
     *
     * @param {string} appURL URL of the index.html file for the application
     * @param {function(err)} callback Asynchronous callback function with one argument (the error)
     *
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    function ShowExtensionsFolder(){alert("ShowExtensionsFolder")};
    appshell.app.showExtensionsFolder = function (appURL, callback) {
        ShowExtensionsFolder(callback, appURL);
    };
 
    // Alias the appshell object to brackets. This is temporary and should be removed.
    brackets = appshell;
})();