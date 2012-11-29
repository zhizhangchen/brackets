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


/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

/**
 * ExtensionUtils defines utility methods for implementing extensions.
 */
define(function (require, exports, module) {
    "use strict";
    
    function getFileUrl(module, path) {
        var modulePath = module.uri.substr(0, module.uri.lastIndexOf("/") + 1),
            url = modulePath + path;

            var getUrl = url;

            if (brackets.platform === "win" && url.indexOf(":") !== -1) {
                getUrl = "file:///" + url;
            }
            else
                getUrl = "file://" + url;
            return getUrl;

    }

    /**
     * Loads a style sheet relative to the extension module.
     *
     * @param {!module} module Module provided by RequireJS
     * @param {!string} path Relative path from the extension folder to a CSS file
     * @return {!$.Promise} A promise object that is resolved if the CSS file can be loaded.
     */
    function loadStyleSheet(module, path) {
        var result = new $.Deferred(),
            url = getFileUrl(module, path);
        $.get(url).done(function (data, textStatus, jqXHR) {
            var $link = $("<link/>");

            $link.attr({
                type:       "text/css",
                rel:        "stylesheet",
                href:       url
            });

            $("head").append($link[0]);

            result.resolve($link[0]);
        }).fail(function (err) {
            result.reject(err);
        });

        return result;
    }

    /**
     * Loads a less style sheet relative to the extension module.
     *
     * @param {!module} module Module provided by RequireJS
     * @param {!string} path Relative path from the extension folder to a CSS file
     * @return {!$.Promise} A promise object that is resolved if the CSS file can be loaded.
     */
    function loadLessFile(module, path) {
        var result = new $.Deferred();
        $.get(getFileUrl(module, path)).done(function (data) {
            var parser = new less.Parser();
            parser.parse(data, function onParse(err, tree) {
                console.assert(!err, err);
                result.resolve($("<style>" + tree.toCSS() + "</style>")
                    .appendTo(window.document.head));
            });
        }).fail(function (err) {
            result.reject(err);
        });

        return result;
    }

    exports.loadStyleSheet = loadStyleSheet;
    exports.loadLessFile = loadLessFile;
    exports.getFileUrl = getFileUrl;
});
