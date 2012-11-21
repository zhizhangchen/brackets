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
    var Command        = brackets.getModule("command/Commands"),
        CommandManager = brackets.getModule("command/CommandManager"),
        Menu           = brackets.getModule("command/Menus"),
        Dialogs        = brackets.getModule("widgets/Dialogs"),
        ProjectManager = brackets.getModule("project/ProjectManager"),
        FileUtils      = brackets.getModule("file/FileUtils"),
        Strings        = brackets.getModule("strings");

    /**
     * Invoke Tizen project conversions dialog.
     */
    function _convertToTizenProject() {
        var templatePath = FileUtils.getNativeModuleDirectoryPath(module)
                                + "/WebProject/",
            projectRoot = ProjectManager.getProjectRoot().fullPath,
            replaceProjectName = function (file) {
                brackets.fs.readFile(file, "ascii", function (err, data) {
                    brackets.fs.writeFile(file,
                        data.replace(/#PROJECT_NAME#/g, 
                            ProjectManager.getProjectRoot().name),
                        "ascii");
                });
            },
            copyTemplateFile = function (file, replaceName) {
                brackets.fs.createReadStream(templatePath + file)
                    .on('end', function () {
                        if (replaceName)
                            replaceProjectName(projectRoot + file);
                    })
                    .pipe(brackets.fs.createWriteStream(projectRoot + file));
            };

        copyTemplateFile(".project", true);
        brackets.fs.mkdir(projectRoot + ".settings");
        brackets.fs.readdir(templatePath + ".settings", function (err, files) {
            for (var i in files) {
                console.log(files[i]);
                copyTemplateFile('.settings/' + files[i],
                    files[i] === 'org.eclipse.wst.common.component');
            }
            Dialogs.showModalDialog(Dialogs.DIALOG_ID_ERROR, 
                "Convert to Tizen project",
                "Conversion succeeded! You can use Tizen Eclipse IDE to import "
                + "it into your Eclipse workspace.");
        });
    }

    /**
     * Load Tizen project extension.
     */
    function load() {
        var cmdTizen, fileMenu, projMenu;

        Strings.CMD_CONVERT_TO_TIZEN_PROJECT  = "Convert To Tizen Project";
        Command.FILE_CONVERT_TO_TIZEN_PROJECT = "file.convertToTizenProject";
        cmdTizen = CommandManager.register(Strings.CMD_CONVERT_TO_TIZEN_PROJECT,
                Command.FILE_CONVERT_TO_TIZEN_PROJECT, _convertToTizenProject);

        // Add to File menu
        fileMenu = Menu.getMenu(Menu.AppMenuBar.FILE_MENU);
        fileMenu.addMenuItem(cmdTizen.getID(), "", Menu.LAST_IN_SECTION,
                Menu.MenuSection.FILE_LIVE);
    }

    // Initialize
    load();
});
