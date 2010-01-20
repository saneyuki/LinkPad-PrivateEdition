/*******************************************************************************
 * Export Symbols, Stand by using FUEL.
 ******************************************************************************/
var EXPORTED_SYMBOLS = ["LinkpadItem", "LinkpadService"];

var Application = Components.classes["@mozilla.org/fuel/application;1"]
                  .getService(Components.interfaces.fuelIApplication);

/*******************************************************************************
 * Observer topics
 ******************************************************************************/
const TOPIC_DEFAULT = "netscape-linkpad";
const TOPIC_SHUTDOWN_XPCOM = "xpcom-shutdown";
const TOPIC_SHUTDOWN_APP = "quit-application-granted";

/*******************************************************************************
 * LinkpadService values.
 ******************************************************************************/
const SERVICE_DIR = "ProfD";
const SERVICE_FILE = "linkpad.sqlite";
const SERVICE_TABLES = {
	items: "ID INTEGER PRIMARY KEY AUTOINCREMENT, URL TEXT, " + 
                  "title TEXT, sortIndex INTEGER"
};
const SERVICE_STMTS = {
	insertItem: "INSERT INTO items (URL, title, sortIndex) VALUES " +
                "(:URL, :title, :sortIndex)",
	updateItem: "UPDATE items SET URL = :URL, title = :title, " +
                "sortIndex = :sortIndex WHERE ID = :ID",
	removeItem: "DELETE FROM items WHERE ID = :ID",
	selectItems: "SELECT * FROM items ORDER BY sortIndex",
	clearItems: "DELETE FROM items"
};
const SERVICE_CREATE_ITEM = "createItem";
const SERVICE_UPDATE_ITEM = "updateItem";
const SERVICE_DELETE_ITEM = "deleteItem";
const SERVICE_CLEAR_ITEMS = "clearItems";
const SERVICE_PRIVACY = "privacy.item.linkpad";

/*******************************************************************************
 * Helper function to create an item component from a mozIStorage row.
 *
 * @param     aRow           The row containing the item data.
 * @return                   The created item.
 ******************************************************************************/
function createItemFromRow(aRow) {
	var rv = new LinkpadItem();
	rv.init(aRow.URL, aRow.ID, aRow.title, aRow.sortIndex);
	return rv;
}

/*******************************************************************************
 * Helper function to sort objects by sortIndex.
 ******************************************************************************/
function sorter(a, b) {
	if (a.sortIndex > b.sortIndex) {
		return 1;
	}
	else if (a.sortIndex == b.sortIndex) {
		return 0;
	}
	else {
		return -1;
	}
}

/*******************************************************************************
 * Helper function to access to objects wrapped with xpconnect.
 ******************************************************************************/
function wrapper(aObject) {
	return { wrappedJSObject: aObject };
}

/*******************************************************************************
 * interfaced used to describe link items stored in the linkpad service.
 * 
 * @version   1.0
 ******************************************************************************/
function LinkpadItem() {
}
LinkpadItem.prototype = {
	_URL: null,
	_ID: null,
	_title: null,
	_sortIndex: null,

	// LinkpadItem
	get URL() {
		return this._URL;
	},

	get ID() {
		return this._ID;
	},

	get title() {
		return this._title;
	},

	get sortIndex() {
		return this._sortIndex;
	},
	set sortIndex(aVal) {
		this._sortIndex = aVal;
	},

	init: function ITEM_init(aURL, aID, aTitle, aSortIndex) {
		this._URL = aURL;
		this._ID = aID;
		this._title = aTitle;
		this._sortIndex = aSortIndex;
	},

	clone: function ITEM_clone() {
		var rv = new LinkpadItem();
		rv.init(this._URL, this._ID, this._title, this._sortIndex);
		return rv;
	}
};

/*******************************************************************************
 * Service used to store URIs for later use.  URIs will be stored in an
 * sqlite database in fifo order and returned in the same order.
 * 
 * @version   1.0
 ******************************************************************************/
function LinkpadService() {
	this._load();
}
LinkpadService.prototype = {
	_statements: null,
	_conn: null,
	_obs: null,
	_items: null,

	// nsIObserver
	observe: function SERVICE_observe(aSubject, aTopic, aData) {
		switch (aTopic) {

		case TOPIC_SHUTDOWN_APP:
			this._unload();
			break;

		case TOPIC_SHUTDOWN_XPCOM:
			this._unloadFinal();
			break;

		default:
			return;
			break;
		}
	},

	// LinkpadService
	get databaseFile() {
		if (!this._conn) {
			return null;
		}
		return this._conn.databaseFile;
	},

	hasItem: function SERVICE_hasItem(aID) {
		return this._items.some(function(aObject) { return aObject.ID == aID; });
	},

	getItem: function SERVICE_getItem(aID) {
		if (!this.hasItem(aID)) {
			return null;
		}
		return this._items.filter(function(aObject) { return aObject.ID == aID; }).shift();
	},

	getItems: function SERVICE_getItems() {
		var rv = new Array();
		var index = 0;
		this._items.sort(sorter);
		while (index < this._items.length) {
			rv[index] = this._items[index];
			
			index++;
		}
		return rv;
	},

	createItem: function SERVICE_createItem(aURL, aTitle, aSortIndex) {
		var statement = this._statements["insertItem"];
		var params = statement.params;

		var newIndex = 0;
		if (aSortIndex == newIndex) {
			if (this._items.length > 0) {
				this._items.sort(sorter);
				newIndex = this._items[this._items.length-1].sortIndex + 100;
			}
			else {
				newIndex = 100;
			}
		}
		else {
			newIndex = aSortIndex;
		}

		params.URL = aURL;
		params.title = aTitle;
		params.sortIndex = newIndex;
		statement.execute();

		var ID = this._conn.lastInsertRowID;

		var item = new LinkpadItem();
		item.init(aURL, ID, aTitle, newIndex);
		this._items[this._items.length] = item;
		this._items.sort(sorter);

		this._notify(item, SERVICE_CREATE_ITEM);
	},

	updateItem: function SERVICE_updateItem(aItem) {
		if (!this.hasItem(aItem.ID)) {
			return;
		}

		var statement = this._statements["updateItem"];
		var params = statement.params;

		params.ID = aItem.ID;
		params.URL = aItem.URL;
		params.title = aItem.title;
		params.sortIndex = aItem.sortIndex;
		statement.execute();

		var items = this._items.filter(function(aObject) { return aObject.ID != ID; });
		this._items = items;
		this._items[this._items.length] = aItem.clone();
		this._items.sort(sorter);

		this._notify(aItem, SERVICE_UPDATE_ITEM);
	},

	deleteItem: function SERVICE_deleteItem(aID) {
		var item = this.getItem(aID);
		if (!item) {
			return;
		}

		var statement = this._statements["removeItem"];
		statement.params.ID = aID;
		statement.execute();

		var items = this._items.filter(function(aObject) { return aObject.ID != aID; });
		this._items = items;
		this._items.sort(sorter);

		this._notify(item, SERVICE_DELETE_ITEM);
	},

	clearItems: function SERVICE_clearItems() {
		var statement = this._statements["clearItems"];
		statement.execute();
		// clear cache
		this._items = new Array();

		this._notify(this, SERVICE_CLEAR_ITEMS);
	},

	compactDB: function SERVICE_compactDB() {
		if (this._conn.transactionInProgress) {
			throw Components.results.NS_ERROR_FAILURE;
		}
		this._conn.executeSimpleSQL("VACUUM");
	},

	_load: function SERVICE_load() {
		// get observer service and add observers
		this._obs = Components.classes["@mozilla.org/observer-service;1"]
		            .getService(Components.interfaces.nsIObserverService);
		this._obs.addObserver(this, TOPIC_SHUTDOWN_APP, false);
		this._obs.addObserver(this, TOPIC_SHUTDOWN_XPCOM, false);
		this._addObserve = true;

		// setup empty cache
		this._items = new Array();

		// setup the database
		this._loadFinal();
	},

	_loadFinal: function SERVICE__loadFinal() {

		// get the database file
		var dir = Components.classes["@mozilla.org/file/directory_service;1"]
		          .getService(Components.interfaces.nsIProperties);
		var file = dir.get(SERVICE_DIR, Components.interfaces.nsIFile);
		file.append(SERVICE_FILE);

		// open a connection to the database
		var storage = Components.classes["@mozilla.org/storage/service;1"]
		              .getService(Components.interfaces.mozIStorageService);
		try {
			this._conn = storage.openDatabase(file);
		}
		catch(e) {

			// database is corrupt - remove and try again
			if (e.result == 0x805200b) {
				file.remove(false);
				this._conn = storage.openDatabase(file);
			}
			// unknown error
			else {
				throw e;
			}
		}

		// create the table
		for (var name in SERVICE_TABLES) {
			if (!this._conn.tableExists(name)) {
				this._conn.createTable(name, SERVICE_TABLES[name]);
			}
		}

		// create the needed statements
		this._statements = {};
		for (name in SERVICE_STMTS){
			this._statements[name] = this._conn.createStatement(SERVICE_STMTS[name]);
		}

		// load the cache
		var statement = this._statements["selectItems"];
		while (statement.step()) {
			this._items[this._items.length] = createItemFromRow(statement.row);
		}
		// delete statement
		statement.finalize();
	},

	_unload: function SERVICE__unload() {

		// check if we clear on shutdown
		var branch = Components.classes["@mozilla.org/preferences-service;1"]
		             .getService(Components.interfaces.nsIPrefService).getBranch("");
		if (!branch.getBoolPref(SERVICE_PRIVACY)) {
			return;
		}

		// clear the database
		try {
			this.clearItems();
			this.compactDB();
		} catch(e) {}
	},

	_unloadFinal: function SERVICE__unloadFinal() {

		// remove observers
		this._obs.removeObserver(this, TOPIC_SHUTDOWN_APP);
		this._obs.removeObserver(this, TOPIC_SHUTDOWN_XPCOM);

		// remove variables
		this._statements = null;
		this._conn = null;
		this._obs = null;
		this._items = null;
	},

	// notify observers
	_notify: function SERVICE__notify(aSubject, aData) {
		var subject = wrapper(aSubject);
		try {
			this._obs.notifyObservers(subject, TOPIC_DEFAULT, aData);
		} catch(e) {
			Components.utils.reportError(e);
		}
	},

};
// initialize
var LinkpadService = new LinkpadService();