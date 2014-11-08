/** Extension that allows customisation of JSLint */
define(function (require, exports, module) {
    "use strict";
	
    // Imports
    var $Commands	= brackets.getModule("command/CommandManager"),
        $Prefs		= brackets.getModule("preferences/PreferencesManager"),
        $Files		= brackets.getModule("filesystem/FileSystem"),
        $FileUtils	= brackets.getModule("file/FileUtils"),
        $Menus		= brackets.getModule("command/Menus"),
        $Loader		= brackets.getModule("utils/ExtensionLoader"),
        $Inspector	= brackets.getModule("language/CodeInspection"),
		$Dialogs	= brackets.getModule("widgets/Dialogs");
    
    // Some useful constants
    var APP_PATH = $FileUtils.getNativeBracketsDirectoryPath();
    var JSLINT_PATH = APP_PATH + "/extensions/default/JSLint";
    var OPTS = [
        ["ass",        "assignment expressions should be allowed"                   ],
        ["bitwise",    "bitwise operators should be allowed"                        ],
        ["browser",    "the standard browser globals should be predefined"          ],
        ["closure",    "Google Closure idioms should be tolerated"                  ],
        ["continue",   "the continuation statement should be tolerated"             ],
        ["debug",      "debugger statements should be allowed"                      ],
        ["devel",      "logging should be allowed (console, alert, etc.)"           ],
        ["eqeq",       "== should be allowed"                                       ],
		["es5",		   "Allow ES5 features"											],
        ["evil",       "eval should be allowed"                                     ],
        ["forin",      "for in statements need not filter"                          ],
        ["newcap",     "constructor names capitalization is ignored"                ],
        ["node",       "Node.js globals should be predefined"                       ],
        ["nomen",      "names may have dangling _"                                  ],
        ["passfail",   "the scan should stop on first error"                        ],
        ["plusplus",   "increment/decrement should be allowed"                      ],
        ["properties", "all property names must be declared with /*properties*/"    ],
        ["regexp",     "the . should be allowed in regexp literals"                 ],
        ["rhino",      "the Rhino environment globals should be predefined"         ],
        ["unparam",    "unused parameters should be tolerated"                      ],
        ["sloppy",     "the 'use strict'; pragma is optional"                       ],
        ["stupid",     "really stupid practices are tolerated"                      ],
        ["sub",        "all forms of subscript notation are tolerated"              ],
        ["todo",       "TODO comments are tolerated"                                ],
        ["vars",       "multiple var statements per function should be allowed"     ],
        ["white",      "sloppy whitespace is tolerated"                             ]
    ];
    var OPT_INDEX_NAME = 0, OPT_INDEX_DESC = 1;
    
    var prefs = $Prefs.getExtensionPrefs("extensions.jslint.customiser");
	var stateManager = $Prefs.stateManager.getPrefixedSystem("extensions.jslint.customiser");
	
    var menu = $Menus.addMenu("JSLint", "jslint", $Menus.AFTER, $Menus.AppMenuBar.VIEW_MENU);
    
    // Helpers
    var log = function (str) { console.log("[JSLintCustomiser] " + str); };
    var error = function(str) { console.error("[JSLintCustomiser] ERROR: " + str); };
    
    var opts = prefs.get("opts") || {};
    
	/**
	 * Updates the JSLint plugin with the current options.
	 */
    var updateJSLint = function (done) {
        var file = $Files.getFileForPath(JSLINT_PATH + "/main.js");
		log("updateJSLint: " + JSLINT_PATH);
        file.read(function (err, data, stat) {
            if (err) {
                error("Failed to open main.js. Aborting.");
            } else {
                // Modify JSLint plugin
                var lines = data.split("\n");
                lines.forEach(function(line, index) {
                    if(line.indexOf("JSLINT(text") !== -1) {
                        lines[index] = "        var jslintResult = JSLINT(text, " + JSON.stringify(opts) + ");";
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
	
	/**
	 * Creates a HTML template for an option.
	 */
	var createOptionTemplate = function(opt) {
		
		log("Creating option for template: ", JSON.stringify(opt));
		
		var name = opt[OPT_INDEX_NAME];
		
		var template = '<div style="width: 50%; float: left;">\
						<label>\
							<div style="float: left; width: 24px; vertical-align: middle;">\
									<input data-opt="{{name}}" class="opt-checkbox" type="checkbox"\
											{{checked}} />\
								</div>\
								<div style="overflow: hidden; margin-bottom: 12px;">\
									<span style="font-weight: bold; color: #ff9d00;">{{name}}</span>\
									<span>{{description}}</span>\
							</div>\
						</label>\
						</div>';
		
		if(opts[name]) {
			log("Template is checked for: ", opt[OPT_INDEX_NAME]);
		}
		
		return Mustache.render(template, { 
			name: opt[OPT_INDEX_NAME], 
			description: opt[OPT_INDEX_DESC],
			checked: opts[opt[OPT_INDEX_NAME]] ? 'checked="checked"' : ""
		});
	};
	
	var createGlobalsTemplate = function() {
		var template = '<div style="margin: 12px 0 0 0;">\
							<div style="float: left">\
								<span>Globals: </span>\
							</div>\
							<div style="overfloat: hidden; style="width: 100%; position: relative; margin: 0px;"">\
								<input id="globals" type="text" style="display: block; width: 97%;"  value="{{globals}}" />\
							</div>\
						</div>';
		return Mustache.render(template, { globals: (opts.predef || []).join(", ") });
	};
	
	/**
	 * Create a HTML template for each JSLint option.
	 */
	var createTemplatesForDialog = function() {
		var optionDialogTemplates = [], i;
		for(i = 0; i < OPTS.length; i++) {
			optionDialogTemplates.push(createOptionTemplate(OPTS[i]));
		}
		
		return optionDialogTemplates;
	};
	
	/**
	 * Open the JSLint options dialog
	 */
	var openDialog = function(optionDialogTemplates, globalsTemplate) {
		var template = [
			optionDialogTemplates.join("\n"), 
			'<div style="clear: both;"></div>',
			globalsTemplate
		].join("\n");
		
		$Dialogs.showModalDialog(
			"jslint-settings-dialog", 
			"JSLint Options", 
			template, // TODO: Load template
			null,  // TODO: Currently default buttons (null)
			true
		);
		
		$("button[data-button-id=ok]").text("Save and Reload Extensions");
	};
	
	// -- Initialisation ----------------------------------------------------------------------------------------------------
	
	// Register command for opening dialog
	var dialogCommandId = "jslint.customiser.opendialog";
	$Commands.register("JS Lint Options", dialogCommandId, function() {
		
		// Create HTML templates for JSLint options dialog
		var optionDialogTemplates = createTemplatesForDialog();
		var globalsTemplate = createGlobalsTemplate();
		
		// Create and open JSLint options dialog
		openDialog(optionDialogTemplates, globalsTemplate);
		
		// Set up event handlers
		$("input[data-opt]").click(function() {
			var name = $(this).data("opt");
			opts[name] = !opts[name];
			log("opt selected: ", name, "=", opts[name]);
		});
		$("button[data-button-id=" +$Dialogs.DIALOG_BTN_OK + "]").click(function(ev) {
			log("Save JS Lint Options");
			$("#globals").css("background", "");
			
			var globals = $("#globals").val();
			if(globals.match(/^(?:(?:[a-zA-Z0-9\_\$]+)(?:,\s+)?)*$/)) {
				opts.predef = globals.split(/,\s*/);
				prefs.set("opts", opts, { location: { scope: "user" } });
				updateJSLint(function() {
					// FIXME: Really, we would like to reload the JSLint extension
					// programatically, but currently it is unclear how this should
					// be accomplished.
					$Commands.execute("debug.refreshWindow");
				});
			} else {
				$("#globals").css("background", "#E38AAE");
				ev.preventDefault();
				ev.stopPropagation();
			}
		});
	});
	menu.addMenuItem(dialogCommandId);
    
    // Do initial update in case JSLint has been externally modified.
    updateJSLint();
    
});