/* * The MIT License (MIT)
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
        ProjectManager  = brackets.getModule("project/ProjectManager"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        Dialogs         = brackets.getModule("widgets/Dialogs"),
        Strings         = brackets.getModule("strings"),
        Inspector      = brackets.getModule("LiveDevelopment/Inspector/Inspector");

    // <style> tag containing CSS code compiled from LESS
    var _$styleTag;
    // The toolbar button
    var _$button;
    /** Loads a less file as CSS into the document */
    var _$debugging = false;
    var _deviceSelect;

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
        if (Inspector.connected()) {
            LiveDevelopment.close();
            _$debugging = false;
        }
        else {
            _$debugging = true;
            CommandManager.execute(Commands.FILE_LIVE_FILE_PREVIEW, true);
        }
    }
    // --- Loaders and Unloaders ---

    function _loadStyle() {
        return brackets.getModule("utils/ExtensionUtils").loadStyleSheet(module, "main.less").done(function ($node) {
            _$styleTag = $node;
        });
    }

    function _unloadStyle() {
        _$styleTag.remove();
    }

    function _getDeviceProjectPath() {
        return "/opt/usr/apps/" + ProjectManager.getProjectId() + "/res/wgt/";
    }

    var realDeviceUrlMapper = function (url) {
            var encodedDocPath = encodeURI(url);
            var encodedProjectPath = encodeURI(ProjectManager.getProjectRoot().fullPath);
            return url.replace(new RegExp(".*" + encodedProjectPath), "file://" + _getDeviceProjectPath());
        };
    function _setDevice(deviceName) {
        deviceName = deviceName || localStorage.getItem("brackets-device-name") || "Simulator";
        localStorage.setItem("brackets-device-name", deviceName);
        window.device = deviceName;
        _deviceSelect.val(deviceName);
        Inspector.setSocketsGetter(null);
        if (deviceName !== "Simulator") {
            LiveDevelopment.addUrlMapper(realDeviceUrlMapper);
            Inspector.setInspectorJson(_getInspectorJsonName()).done( function () {
                if (Inspector.connected()) {
                    LiveDevelopment.close();
                    LiveDevelopment.open(Inspector.usingDevTool());
                }
            });
        }
        else if (child_process) {
            LiveDevelopment.removeUrlMapper(realDeviceUrlMapper);
            Inspector.setInspectorJson(_getInspectorJsonName()).done( function () {
                if (Inspector.connected()) {
                    LiveDevelopment.close();
                    LiveDevelopment.open(Inspector.usingDevTool());
                }
            });
        }
        else {
            Inspector.getAvailableSockets().done(function() {
                LiveDevelopment.removeUrlMapper(realDeviceUrlMapper);
                Inspector.setInspectorJson(_getInspectorJsonName()).done( function () {
                    if (Inspector.connected()) {
                        LiveDevelopment.close();
                        LiveDevelopment.open(Inspector.usingDevTool());
                    }
                });
            }).fail(function () {
                Dialogs.showModalDialog(
                    Dialogs.DIALOG_ID_INFO,
                    Strings.LIVE_DEVELOPMENT_INFO_TITLE,
                    "To support Simulator live development, please restart your chrome/chromium browser with \"--remote-debugging-port=9222 --disable-web-security\""
                ).done(function (id) {
                    var simulatorOption = _deviceSelect.find("option:selected");
                    _setDevice((simulatorOption.next('option') || simulatorOption.prev('option')).val());
                });
            });
        }
    }


    function _getInspectorJsonName (){
        return  (window.device !== "Simulator" ||
                    parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2]) <= 23)
                        ? "Inspector_old.json": "Inspector.json";
    }

    function _addDevices(stdout, valuePrefix, labelPrefix, htmlSaveCallback) {
        stdout.split("\n").forEach (function (device) {
            var deviceInfo = device.split("\t");
            if (deviceInfo.length === 3){
                _deviceSelect.append($("<option value='" + valuePrefix + deviceInfo[0] + "'>" + labelPrefix + deviceInfo[2] + "</option>"));
                $(LiveDevelopment).on("liveHTMLSaved", function (event,doc) {
                    if (this === window.device)
                        htmlSaveCallback(event, doc);
                }.bind(valuePrefix + deviceInfo[0]));
            }
        })
        _deviceSelect.val(window.device);
    }

    function load() {
        var result = new $.Deferred();
        _loadStyle().done(function () {
            _deviceSelect = $("<select id='devices'><option value='Simulator'>Simulator</option></select>")
                                    .change(function() {
                                        $("option:selected", this).each(function () {
                                            _setDevice($(this).val());
                                        })
                                    });
            child_process && child_process.exec('sdb devices',function(err, stdout, stderr) {
                _addDevices(stdout, "", "", function (event, doc) {
                    execDeviceCommand("push " + doc.file.fullPath + " " +
                        _getProjectPath(), function () {
                        Inspector.Page.reload();
                    });
                })
            });
            require(["/nowjs/now.js"], function () {
                now.ready(function () {
                    now.getDevices(function(err, stdout, stderr) {
                        _addDevices(stdout, "RemoteEmulator:", "(Remote)", function (event, doc) {
                            now.pushProjectFileToDevice(ProjectManager.getProjectId(),
                                doc.file.fullPath, doc.getText(true),
                                window.device.split(":")[1], function () {
                                Inspector.Page.reload();
                            });
                        })
                    })
                })
            })
            _setDevice();
            _deviceSelect.insertBefore('#main-toolbar .buttons :first-child');
            result.resolve();
        }).fail(result.reject);

        return result.promise();
    }

    function unload() {
    }


    // --- Exports ---

    exports.load = load;
    exports.unload = unload;


    // --- Initializiation ---

    load();
});
