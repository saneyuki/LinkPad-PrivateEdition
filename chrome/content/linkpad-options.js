var LinkpadOptions = {

	get service() {
		delete this.service;
		return this.service = LinkpadService;
	},

	get strings() {
		delete this.strings;
		return this.strings = this.service.strings;
	},

	handleEvent: function (aEvent) {
		switch (aEvent.type) {
			case "load":
				this.onLoad();
				break;
		}
	},

	onLoad: function LinkpadOptions_onLoad() {
		window.removeEventListener("load", this, false);

		// Import JavaScript Compornent code module.
		Components.utils.import("resource://linkpad/linkpad-module.js");

		this.getDBSize();
	},

	getDBSize: function LinkpadOptions_getDBSize() {
		var dbFile = this.service.databaseFile;
		var format, value;
		if (!dbFile) {
			format = "linkpad.prefs.database.unknown";
			value = this.strings.get(format);
		}
		else {
			var fileSize = dbFile.fileSize;
			var KB = parseInt(fileSize/1024);
			var MB = parseInt(KB/1024);
			if (MB > 0) {
				format = "linkpad.prefs.database.MB";
				value = this.strings.get(format, [MB]);
			} else if (KB > 0) {
				format = "linkpad.prefs.database.KB";
				value = this.strings.get(format, [KB]);
			} else {
				format = "linkpad.prefs.database.B";
				value = this.strings.get(format, [fileSize]);
			}
		}
		document.getElementById("database_caption").setAttribute("label", value);
	},

	compactDB: function LinkpadOptions_compactDB() {
		try {
			this.service.compactDB();
			var label = this.strings.get("linkpad.prefs.database.unknown");
			document.getElementById("database_caption").setAttribute("label", label);
		}
		catch(e) {}
	}
};
window.addEventListener("load", LinkpadOptions, false);