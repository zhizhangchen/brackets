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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true, bitwise: true */
/*global define, brackets, $, window */

define(function (require, exports, module) {
    "use strict";

    // Brackets modules
    var DocumentManager = brackets.getModule("document/DocumentManager"),
        EditorManager   = brackets.getModule("editor/EditorManager"),
        FileUtils       = brackets.getModule("file/FileUtils");

    /**
     * Load CodeMirror2 utilities
     */
    function _getCodeMirrorModule() {
        require("../../../thirdparty/CodeMirror2/addon/hint/javascript-hint");
        require("../../../thirdparty/CodeMirror2/addon/hint/simple-hint");
        brackets.getModule("utils/ExtensionUtils").loadStyleSheet(module, "../../../thirdparty/CodeMirror2/addon/hint/simple-hint.css");
    }

    /**
     * Get extension folder URL
     */
    function _extensionUrl() {
        var path = FileUtils.getNativeModuleDirectoryPath(module) + "/";
        if (path[0] !== "/" && path[1] === ":")
            //We are on Windows
            return "file:///" + path.replace(/\\/g, "/")
        else
            return "file://" + path;
    }

    /**
     * Inject platform namespace and its module APIs 
     */
    function _injectPlatformNamespace() {
        var platformApis, platform;

        platformApis = {
            tizen: ['alarm', 'application', 'bluetooth', 'calendar', 'call',
                'contact', 'filesystem', 'lbs', 'mediacontent', 'messaging',
                'nfc', 'systeminfo', 'time', 'power', 'download',
                'notification']
        };

        function _inject(module) {
            var relPath, apiUrl;

            relPath = 'apis/' + platform + '/' + module + '.json';
            apiUrl = brackets.getModule("utils/ExtensionUtils")
                                .getModuleUrl(module, relPath);

            $.getJSON(apiUrl, function (apiObj) {
                if (platform === module) {
                    window[platform] = apiObj;
                    return;
                } else if (window[platform]) {
                    window[platform][module] = apiObj;
                }
            });
        }

        for (platform in platformApis) {
            _inject(platform);
            platformApis[platform].forEach(_inject);
        }
    }

    /**
     * Add automatical completion function for current editor
     */
    function _autoComplete() {
        var curEditor, cmEditor, onKeyEventBase;

        curEditor = EditorManager.getCurrentFullEditor();
        if (!curEditor || !curEditor._codeMirror) {
            return;
        }

        cmEditor = curEditor._codeMirror;
        var extraKeys = cmEditor.getOption("extraKeys");
        if (extraKeys)
            extraKeys["Ctrl-P"] = "autocomplete";

        onKeyEventBase = cmEditor.getOption("onKeyEvent");
        cmEditor.setOption("onKeyEvent", function (cm, ev) {
            if (onKeyEventBase) {
                onKeyEventBase(cm, ev);
            }

            if (ev.type !== "keyup")
                return;

            if (ev.ctrlKey || ev.altKey || ev.shiftKey || ev.metaKey)
                return;

            // '.' in Alphabeta keyboard and Numpad
            if (ev.keyCode === 190 || ev.keyCode === 110) {
                CodeMirror.commands.autocomplete(cm);
            }
        });
    }

    /**
     * Load AutoComplete extension.
     */
    function load() {
        _getCodeMirrorModule();

        CodeMirror.commands.autocomplete = function (cm) {
            CodeMirror.simpleHint(cm, CodeMirror.javascriptHint);
        };
        _autoComplete();
        $(DocumentManager).on("currentDocumentChange", _autoComplete);

        _injectPlatformNamespace();
    }

    // Initialize
    load();
});
