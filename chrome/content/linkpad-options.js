var LinkpadOptions = {

	_service: null,
	get service() {
		if (!this._service) {
			this._service = LinkpadService;
		}
		return this._service;
	},

	onLoad: function LinkpadOptions_onLoad() {
		// Import JavaScript Compornent code module.
		Components.utils.import("resource://linkpad/linkpad-module.js");

		this.getDBSize();
	},

	getDBSize: function LinkpadOptions_getDBSize() {
		var dbFile = this.service.databaseFile;
		var format, value;
		if (!dbFile) {
			format = "linkpad.prefs.database.unknown";
			value = this.getString(format);
		}
		else {
			var fileSize = dbFile.fileSize;
			var KB = parseInt(fileSize/1024);
			var MB = parseInt(KB/1024);
			if (MB > 0) {
				format = "linkpad.prefs.database.MB";
				value = this.getString(format, [MB]);
			} else if (KB > 0) {
				format = "linkpad.prefs.database.KB";
				value = this.getString(format, [KB]);
			} else {
				format = "linkpad.prefs.database.B";
				value = this.getString(format, [fileSize]);
			}
		}
		document.getElementById("database_caption").setAttribute("label", value);
	},

	getString: function LinkpadOptions_getString(aName, aReplace) {
		var bundle = document.getElementById("linkpad_bundle");
		if (!bundle) {
			return "";
		}
		if (!aReplace) {
			return bundle.getString(aName);
		}
		else {
			return bundle.getFormattedString(aName, aReplace);
		}
	},

	compactDB: function LinkpadOptions_compactDB() {
		try {
			this.service.compactDB();
			var label = this.getString("linkpad.prefs.database.unknown");
			document.getElementById("database_caption").setAttribute("label", label);
		}
		catch(e) {}
	}
};