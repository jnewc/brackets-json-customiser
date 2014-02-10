/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

/** Extension that allows customisation of JSLint */
define(function (require, exports, module) {
    "use strict";
    
    
    
    // Imports
    var $Commands  = brackets.getModule("command/CommandManager"),
        $Prefs     = brackets.getModule("preferences/PreferencesManager"),
        $Files     = brackets.getModule("filesystem/FileSystem"),
        $FileUtils = brackets.getModule("file/FileUtils"),
        $Menus     = brackets.getModule("command/Menus"),
        $Loader    = brackets.getModule("utils/ExtensionLoader"),
        $Inspector = brackets.getModule("language/CodeInspection");
    
    // Some useful constants
    var APP_PATH = $FileUtils.getNativeBracketsDirectoryPath();
    var JSLINT_PATH = APP_PATH + "/extensions/default/JSLint";
    var OPTS = [
        ["ass",        "assignment expressions should be allowed"                    ],
        ["bitwise",    "bitwise operators should be allowed"                         ],
        ["browser",    "the standard browser globals should be predefined"           ],
        ["closure",    "Google Closure idioms should be tolerated"                   ],
        ["continue",   "the continuation statement should be tolerated"              ],
        ["debug",      "debugger statements should be allowed"                       ],
        ["devel",      "logging should be allowed (console, alert, etc.)"            ],
        ["eqeq",       "== should be allowed"                                        ],
        ["evil",       "eval should be allowed"                                      ],
        ["forin",      "for in statements need not filter"                           ],
        ["newcap",     "constructor names capitalization is ignored"                 ],
        ["node",       "Node.js globals should be predefined"                        ],
        ["nomen",      "names may have dangling _"                                   ],
        ["passfail",   "the scan should stop on first error"                         ],
        ["plusplus",   "increment/decrement should be allowed"                       ],
        ["properties", "all property names must be declared with /*properties*/"     ],
        ["regexp",     "the . should be allowed in regexp literals"                  ],
        ["rhino",      "the Rhino environment globals should be predefined"          ],
        ["unparam",    "unused parameters should be tolerated"                       ],
        ["sloppy",     "the 'use strict'; pragma is optional"                        ],
        ["stupid",     "really stupid practices are tolerated"                       ],
        ["sub",        "all forms of subscript notation are tolerated"               ],
        ["todo",       "TODO comments are tolerated"                                 ],
        ["vars",       "multiple var statements per function should be allowed"      ],
        ["white",      "sloppy whitespace is tolerated"                              ]
    ];
    var OPT_INDEX_NAME = 0, OPT_INDEX_DESC = 1;
    
    var prefs = $Prefs.getPreferenceStorage("extensions.jslint.customiser");
    var menu = $Menus.addMenu("JSLint", "jslint", $Menus.AFTER, $Menus.AppMenuBar.VIEW_MENU);
    
    // Helpers
    var log = function (str) { console.log("[JSLintCustomiser] " + str); };
    var error = function(str) { console.error("[JSLintCustomiser] ERROR: " + str); };
    
    var opts = prefs.getValue("opts") || {};
    
    var updateJSLint = function (done) {
        var file = $Files.getFileForPath(JSLINT_PATH + "/main.js");
        file.read(function (err, data, stat) {
            if (err) {
                error("Failed to open main.js. Aborting.");
            } else {
                // Modify JSLint plugin
                var lines = data.split("\n");
                lines.forEach(function(line, index) {
                    if(line.indexOf("JSLINT(text") !== -1) {
                        lines[index] = "var jslintResult = JSLINT(text, " + JSON.stringify(opts) + ");";
                    }
                });
                // Save modifications
                file.write(lines.join("\n"), function(err, stat) {
                    if(err) {
                        error("Failed to save modifications to JSLint plugin.");
                    } else {
                        log("Successfully save JSLint plugin modifications");
                        if(done) { done(); }
                    }
                });
            }
        });
    };
    
    var setCommandChecked = function (opt, val) {
		$Commands.get("jslint.customiser.option_" + opt).setChecked(val);
	};
    
    var createCommand = function(command_id, opt) {
        var name = opt[OPT_INDEX_NAME], desc = opt[OPT_INDEX_DESC];
        $Commands.register( name + " - " + desc, command_id, function () {
            opts[name] = !opts[name];
            setCommandChecked(name, opts[name]); 
            prefs.setValue("opts", opts);
            updateJSLint(function() {
                // FIXME: Really, we would like to reload the JSLint extension
                // programatically, but currently it is unclear how this should
                // be accomplished.
                $Commands.execute("debug.refreshWindow");
                //$Loader.loadExtension("JSLint", { "baseUrl": JSLINT_PATH }, "main");
            });
        });
        setCommandChecked(name, opts[name]);
    };
    
    // Register menu buttons
    for (var i = 0; i < OPTS.length; i++) { 
        var opt = OPTS[i];
        var command_id = "jslint.customiser.option_" + opt[OPT_INDEX_NAME];
        console.log("Adding option: command_id=" + command_id + ", opt=" + opt[OPT_INDEX_NAME]);
        createCommand(command_id, opt);
        menu.addMenuItem(command_id);
    }
    
    // Init
    updateJSLint();
    
    var blah_;
});