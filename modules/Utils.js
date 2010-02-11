/**
 * Utilties
 * The following codes are based on <https://wiki.mozilla.org/Labs/JS_Modules>.
 * @License     MPL 1.1/GPL 2.0/LGPL 2.1
 * @developer   saneyuki
 * @version     20100211.1
 */

var EXPORTED_SYMBOLS = ["Preferences", "Observers", "StringBundle"];

/**
 * Preferences Utils
 * @version 0.1.20100211.1
 */
function Preferences(aPrefBranch) {
	if (aPrefBranch) {
		this._prefBranch = aPrefBranch;
	}
}
Preferences.prototype = {

	_prefBranch: "",

	_prefSvc: null,
	get prefSvc() {
		if (!this._prefSvc) {
			this._prefSvc = Components.classes["@mozilla.org/preferences-service;1"]
			                .getService(Components.interfaces.nsIPrefService)
			                .getBranch(this._prefBranch)
			                .QueryInterface(Components.interfaces.nsIPrefBranch2);
		}
		return this._prefSvc;
	},

	get: function (aPrefName) {
		var Ci = Components.interfaces;
		switch (this.prefSvc.getPrefType(aPrefName)) {
			case Ci.nsIPrefBranch.PREF_STRING:
				return this.prefSvc.getComplexValue(aPrefName, Ci.nsISupportsString).data;

			case Ci.nsIPrefBranch.PREF_INT:
				return this.prefSvc.getIntPref(aPrefName);

			case Ci.nsIPrefBranch.PREF_BOOL:
				return this.prefSvc.getBoolPref(aPrefName);
		}
	},

	set: function (aPrefName, aPrefValue) {
		if (!aPrefValue) {
			return;
		}

		var prefSvc = this.prefSvc;
		var PrefType = typeof aPrefValue;

		switch (PrefType) {
			case "string":
				var str = Components.classes["@mozilla.org/supports-string;1"]
				          .createInstance(Ci.nsISupportsString);
				str.data = aPrefValue;
				prefSvc.setComplexValue(aPrefName, Ci.nsISupportsString, str);
				break;

			case "number":
				prefSvc.setIntPref(aPrefName, aPrefValue);
				break;

			case "boolean":
				prefSvc.setBoolPref(aPrefName, aPrefValue);
				break;
		}
	},

	reset: function (aPrefName) {
		this.prefSvc.clearUserPref(aPrefName);
	},

	resetBranch: function(aPrefBranch) {
		this.prefSvc.resetBranch(aPrefBranch);
	},

	observe: function (aPrefBranch, aObsObj) {
		var prefBranch = this._prefBranch + (aPrefBranch || "");
		this.prefSvc.addObserver(prefBranch, aObsObj, false);
	},

	ignore: function (aPrefBranch, aObsObj) {
		var prefBranch = this._prefBranch + (aPrefBranch || "");
		this.prefSvc.removeObserver(prefBranch, aObsObj);
	},
};
Preferences.__proto__ = Preferences.prototype;

/**
 * Observers Utils
 * @version 0.1.20100211.1
 */
var Observers = {
	_observers: null,
	get observers() {
		if (!this._observers) {
			this._observers = Components.classes["@mozilla.org/observer-service;1"]
			                  .getService(Components.interfaces.nsIObserverService);
		}
		return this._observers;
	},

	add: function (aTopic, aObsObj) {
		var obs = new Observer(aTopic, aObsObj);
		this.observers.addObserver(obs, aTopic, false);
		ObserverCache.push(obs);
	},

	remove: function (aTopic, aObsObj) {
		var observerArray = ObserverCache.filter(function(aElm){ return (aElm.topic == aTopic &&
		                                                                 aElm.obsObj == aObsObj); });
		var self = this;
		observerArray.map(function(aElem){
			self.observers.removeObserver(aElem, aTopic);
			ObserverCache.splice(ObserverCache.indexOf(aElem), 1);
		});
	},

	notify: function (aTopic, aSubject, aData) {
		var subject = { wrappedJSObject: aSubject };
		this.observers.notifyObservers(subject, aTopic, aData);
	},
};

var ObserverCache = new Array();

function Observer(aTopic, aObsObj) {
	this.topic = aTopic;
	this.obsObj = aObsObj;
}
Observer.prototype = {

	topic: null,
	obsObj: null,

	observe: function (aSubject, aTopic, aData) {
		this.obsObj.observe(aSubject.wrappedJSObject, aTopic, aData);
	},
};


/**
 * StringBundle Utils
 * @version 0.1.20100211.1
 */
function StringBundle(aURI) {
	this.propertiesURI = aURI;
}
StringBundle.prototype = {

	propertiesURI: null,

	_bundle: null,
	get bundle() {
		if (!this._bundle) {
			this._bundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
			               .getService(Components.interfaces.nsIStringBundleService)
		                   .createBundle(this.propertiesURI);
		}
		return this._bundle;
	},

	get: function (aStrKey, aPramsArray) {
		if (aPramsArray) {
			return this.bundle.formatStringFromName(aStrKey, aPramsArray, aPramsArray.length);
		}
		else {
			return this.bundle.GetStringFromName(aStrKey);
		}
	},
};

/**
 * StringBundle Utils
 * @version 0.1.20100211.1
 */
var Console = {

	_console: null,
	get console() {
		if (!this._console) {
			this._console = Components.classes["@mozilla.org/consoleservice;1"]
			                .getService(Components.interfaces.nsIConsoleService);
		}
		return this._console;
	},

	log: function (aMsg) {
		this.console.logStringMessage(aMsg);
	},
};