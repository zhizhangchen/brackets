/*
 * The MIT License (MIT)
 * Copyright (c) 2012 Dennis Kehrig. All rights reserved.
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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, forin: true, maxerr: 50, regexp: true */
/*global define, brackets, $, less, io */


/**
 *
 */
define(function main(require, exports, module) {
    'use strict';

    // --- Required modules ---

    // Document Manager
    var CommandManager = brackets.getModule("command/CommandManager"),
        Commands       = brackets.getModule("command/Commands"),
        FileUtils      = brackets.getModule("file/FileUtils"),
        LiveDevelopment = brackets.getModule("LiveDevelopment/LiveDevelopment"),
        Inspector      = brackets.getModule("LiveDevelopment/Inspector/Inspector");

    // <style> tag containing CSS code compiled from LESS
    var _$styleTag;
    // The toolbar button
    var _$button;
    /** Loads a less file as CSS into the document */
    var _$debugging = false;
    function _loadLessFile(file, dir) {
        var result = $.Deferred();

        // Load the Less code
        $.get(dir + file, function (code) {
            // Parse it
            var parser = new less.Parser({ filename: file, paths: [dir] });
            parser.parse(code, function onParse(err, tree) {
                console.assert(!err, err);
                // Convert it to CSS and append that to the document head
                $("<style>").text(tree.toCSS()).appendTo(window.document.head);
                result.resolve();
            });
        });

        return result.promise();
    }

    function _onFrameNavigated(event, res) {
        var elementsPanel;
        if (Inspector.config.reuseDevToolsSocket) {
            var inspector = $('iframe').contents()[0].defaultView.WebInspector;
            if (inspector && inspector.panels &&
                (elementsPanel = inspector.panels.elements)) {
                elementsPanel.performSearch(res.frame.url);
                setTimeout(function () {
                    inspector.domAgent.searchResult(0, function (node) {
                        var treeOutline = elementsPanel.treeOutline;
                        var selectingNode = node && node.children[0];
                        if (!selectingNode) return;
                        elementsPanel.searchCanceled();
                        elementsPanel.selectDOMNode(selectingNode, true);
                        selectingNode.getChildNodes(function (children) {
                            if (children.length) {
                                elementsPanel.selectDOMNode(children[0], true);
                                children[0].getChildNodes(function (grandChildren){
                                    var selectingChild = children[0].ownerDocument.body || children[0].ownerDocument.documentElement;
                                    if (selectingChild) {
                                        elementsPanel.selectDOMNode(selectingChild, true);
                                    }
                                });
                            }
                        })
                    })
                }, 1000);
            }
        }
    }
    /** Find this extension's directory relative to the brackets root */
    function _extensionUrl() {
        var path = FileUtils.getNativeModuleDirectoryPath(module) + "/";
        if (path[0] !== "/" && path[1] === ":")
            //We are on Windows
            return "file:///" + path.replace(/\\/g, "/")
        else
            return "file://" + path;
    }

    /** Handles clicks of the V8 toolbar button */
    function _onButtonClicked() {
        LiveDevelopment.close();
        CommandManager.execute(Commands.FILE_LIVE_FILE_PREVIEW, !_$debugging);
        _$debugging = !_$debugging;
    }
    // --- Loaders and Unloaders ---

    function _loadStyle() {
        return _loadLessFile("main.less", _extensionUrl()).done(function ($node) {
            _$styleTag = $node;
        });
    }

    function _unloadStyle() {
        _$styleTag.remove();
    }

    /** Setup the V8 toolbar button, called by init */
    function _loadButton() {
        var result = new $.Deferred();

        _loadStyle().done(function () {
            _$button = $("<a>").text("Debug").attr({ href: "#", id: "denniskehrig-v8live-button" });
            _$button.click(_onButtonClicked);
            _$button.insertBefore('#main-toolbar .buttons #toolbar-go-live');
            result.resolve();
        }).fail(result.reject);

        return result.promise();
    }

    function load() {
        _loadStyle().done(function () {
            _loadButton();
        });
        $(Inspector.Page).on("frameNavigated.dev-tools", _onFrameNavigated)
    }

    function unload() {
        _disconnect();
    }


    // --- Exports ---

    exports.load = load;
    exports.unload = unload;


    // --- Initializiation ---

    load();
});
