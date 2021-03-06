/*******************************************************************************
 * Export Symbols.
 ******************************************************************************/
var EXPORTED_SYMBOLS = ["LinkpadItem", "LinkpadService", "LinkpadConverter",
                        "LinkpadClipboard", "LinkpadDnD"];

/*******************************************************************************
 * Import JavaScript Compornent code module.
 ******************************************************************************/
Components.utils.import("resource://linkpad/UtilsForExtension.js");

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

const SERVICE_PREF_DOMAIN = "extensions.netscape.linkpad.";

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
var LinkpadService = {
	_statements: null,
	_conn: null,
	_obs: null,
	_items: null,

	get strings() {
		delete this.strings;
		return this.strings = new StringBundle("chrome://linkpad/locale/linkpad.properties");
	},

	get prefBranch() {
		delete this.branch;
		return this.branch = new Preferences(SERVICE_PREF_DOMAIN);
	},

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
		statement.executeAsync();

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
		statement.executeAsync();

		var items = this._items.filter(function(aObject) { return aObject.ID != aID; });
		this._items = items;
		this._items.sort(sorter);

		this._notify(item, SERVICE_DELETE_ITEM);
	},

	clearItems: function SERVICE_clearItems() {
		var statement = this._statements["clearItems"];
		statement.executeAsync();
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

	initialize: function () {
		this._load();
	},

	_load: function SERVICE_load() {
		// get observer service and add observers
		Observers.add(TOPIC_SHUTDOWN_APP, this);
		Observers.add(TOPIC_SHUTDOWN_XPCOM, this);
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
		if (Preferences.get(SERVICE_PRIVACY)) {
			// clear the database
			try {
				this.clearItems();
				this.compactDB();
			} catch(e) {}
		}

		var statements = this._statements;
		for (var name in statements) {
			statements[name].finalize();
		}
		this._conn.close();
	},

	_unloadFinal: function SERVICE__unloadFinal() {

		// remove observers
		Observers.remove(TOPIC_SHUTDOWN_APP, this);
		Observers.remove(TOPIC_SHUTDOWN_XPCOM, this);

		// remove variables
		this._statements = null;
		this._conn = null;
		this._obs = null;
		this._items = null;
	},

	// notify observers
	_notify: function SERVICE__notify(aSubject, aData) {
		try {
			Observers.notify(TOPIC_DEFAULT, aSubject, aData);
		} catch(e) {
			Components.utils.reportError(e);
		}
	},

	// Helper function to determine if the converted linkpad item is valid.
	isValidLinkpadItem: function SERVICE_isValidLinkpadItem(aItem) {
		var properties = ["URL", "title", "ID", "sortIndex"];
		for (var i=0; i<properties.length; i++) {
			if (!aItem.hasOwnProperty(properties[i])) {
				return false;
			}
		}
		if (aItem.URL === "") {
			return false;
		}
		if (aItem.title === "") {
			return false;
		}
		if (this.isValidLinkpadItemRegExp.test(aItem.URL)) {
			return true;
		}
		return false;
	},
	isValidLinkpadItemRegExp: /(ftp:\/\/|http:\/\/|https:\/\/|gopher:\/\/|file:\/\/|about:)(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/,

};
// initialize
LinkpadService.initialize();


/*******************************************************************************
 * Helper function to convert a linkpad item to and from transferable data.
 * If this is a copy or a drag operation the item will be a linkpad item.
 * If this is a paste or drop operation the item will be the transferable data.
 ******************************************************************************/
function LinkpadConverter(aItem) {
	this._item = aItem;
}
LinkpadConverter.prototype = {
	_item: null,

	get: function LinkpadConverter_get(aContentType) {
		if (this._item instanceof LinkpadItem) {
			return this._toData(aContentType);
		}
		return this._fromData(aContentType);
	},

	toString: function LinkpadConverter_toString(aVal) {
		var rv = Components.classes["@mozilla.org/supports-string;1"]
		         .createInstance(Components.interfaces.nsISupportsString);
		rv.data = aVal;
		return rv;
	},

	_toData: function LinkpadConverter__toData(aContentType) {
		var rv = "";
		switch (aContentType) {

			case "text/x-linkpad-item":
				rv = this._item.URL + "\n" + this._item.title + 
			         "\n" + this._item.ID + "\n" + String(this._item.sortIndex);
				break;

			case "text/x-moz-text-internal":
			case "text/x-moz-url":
				rv = this._item.URL + "\n" + this._item.title;
				break;

			case "text/html":
				rv = "<A HREF=\"" + this._item.URL + "\">" + this._item.title + "</A>";
				break;

			case "text/unicode":
				rv = this._item.URL;
				break;

			case "moz/bookmarkclipboarditem":
				rv = this._item.title + "\n" + this._item.URL + "\n";
				rv += "\n\n\n\n\n\n\n";

				var tmpItems = [this._item.title, this._item.URL];
				var separator = "]-[";
				var extrarSeparator = "@";
				for (var i=0; i<tmpItems.length; i++) {
					while (tmpItems[i].indexOf(separator)>-1) {
						separator += extrarSeparator;
					}
				}
				rv = separator + "\n" + rv;
				break;

			default:
				rv.URL = "";
				rv.title = "";
				rv.ID = null;
				rv.sortIndex = 0;
				break;
		}

		return rv;
	},

	_fromData: function LinkpadConverter__fromData(aContentType) {
		var data = this._item;
		data = data.split("\n");

		var rv = {};
		switch (aContentType) {

			case "text/x-linkpad-item":
				rv.URL = data[0];
				rv.title = data[1];
				rv.ID = data[2];
				rv.sortIndex = Number(data[3]);
				break;

			case "text/x-moz-url":
				rv.URL = data[0];
				if (!data[1]) {
					rv.title = unescape(data[0]);
				}
				else {
					rv.title = data[1];
					rv.ID = null;
					rv.sortIndex = 0;
				}
				break;

			case "text/x-moz-text-internal":
				var window = Components.classes["@mozilla.org/appshell/window-mediator;1"]
				             .getService(Components.interfaces.nsIWindowMediator)
				             .getMostRecentWindow("navigator:browser");
				var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
				                 .getInterface(Components.interfaces.nsIWebNavigation)
				                 .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
				                 .rootTreeItem.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
				                 .getInterface(Components.interfaces.nsIDOMWindow);
				var label = mainWindow.gBrowser.selectedTab.linkedBrowser.contentTitle;

				rv.URL = data[0];
				if (!label) {
					rv.title = unescape(data[0]);
				}
				else {
					rv.title = label;
				}
				rv.ID = null;
				rv.sortIndex = 0;
				break;

			case "text/unicode":
				rv.URL = data[0];
				rv.title = unescape(data[0]);
				rv.ID = null;
				rv.sortIndex = 0;
				break;

			case "moz/bookmarkclipboarditem":
				var sep = data.shift();
				var tmpItems = data.join("\n");
				tmpItems = tmpItems.split(sep);
				tmpItems.pop(); 
				for (var i=0; i<tmpItems.length; i++) {
					var childs = tmpItems[i].split("\n");
					childs.pop();
					rv.URL = childs[3];
					rv.title = childs[2];
					rv.ID = null;
					rv.sortIndex = 0;
					break;
				}
				break;

			case "text/html":
			default:
				rv.URL = "";
				rv.title = "";
				rv.ID = null;
				rv.sortIndex = 0;
				break;
		}

		return rv;
	}
};

/*******************************************************************************
* Helper function to deal with clipboard operations.
******************************************************************************/
function LinkpadClipboard() {
}
LinkpadClipboard.prototype = {

	get _board () {
		var clipboard = Components.classes["@mozilla.org/widget/clipboard;1"]
		                .getService(Components.interfaces.nsIClipboard);
		this.__defineGetter__("_board", function(){ return clipboard; });
		return clipboard;
	},

	getTypes: function LinkpadClipboard_getTypes(aAction) {
		var types = ["text/x-linkpad-item", "moz/bookmarkclipboarditem", 
		            "text/x-moz-url", "text/x-moz-text-internal", "text/unicode"];
		if (aAction == "copy") {
			types.push("text/html");
		}
		return types;
	},

	hasData: function LinkpadClipboard_hasData() {
		var types = ["text/x-linkpad-item", "moz/bookmarkclipboarditem", 
		             "text/x-moz-url", "text/x-moz-text-internal", "text/unicode"];

		// see if clipboard has any types
		return this._board.hasDataMatchingFlavors(types, types.length,
		                                          Components.interfaces.nsIClipboard.kGlobalClipboard);
	},

	onCopy: function LinkpadClipboard_onCopy(aItem) {

		// create a transferable
		var converter = new LinkpadConverter(aItem);
		var xferable = Components.classes["@mozilla.org/widget/transferable;1"]
		                         .createInstance(Components.interfaces.nsITransferable);

		// loop through the types and add to the transferable
		var types = this.getTypes("copy");
		var data;
		for (var i=0; i<types.length; i++) {
			data = converter.get(types[i]);
			xferable.addDataFlavor(types[i]);
			xferable.setTransferData(types[i], converter.toString(data), data.length*2);
		}

		// set the transferable on the clipboard
		this._board.setData(xferable, null,
		                    Components.interfaces.nsIClipboard.kGlobalClipboard);
	},

	onPaste: function LinkpadClipboard_onPaste() {

		// create a transferable
		var types = this.getTypes("paste");
		var xferable = Components.classes["@mozilla.org/widget/transferable;1"]
		                         .createInstance(Components.interfaces.nsITransferable);

		// loop through the types and add to the transferable
		for (var i=0; i<types.length; i++) {
			xferable.addDataFlavor(types[i]);
		}
		// get the transferable off the clipboard
		this._board.getData(xferable, Components.interfaces.nsIClipboard.kGlobalClipboard);

		// get the data out of the transferable
		var data = {};
		var type = {};
		try {
			xferable.getAnyTransferData(type, data, {});
			type = type.value;
			data = data.value.QueryInterface(Components.interfaces.nsISupportsString).data;

			// convert the data and return it
			var converter = new LinkpadConverter(data);
			return converter.get(type);
		}
		catch(e) {
			return {};
		}
	}
};

/*******************************************************************************
 * Helper function to deal with drag and drop operations.
 ******************************************************************************/
function LinkpadDnD(aParent, aWindow) {
	this.parentNode = aParent;
	this.window = aWindow;
}
LinkpadDnD.prototype = {

	_parentNode: null,
	get parentNode() {
		return this._parentNode;
	},
	set parentNode(aVal) {
		this._parentNode = aVal;
	},

	_window: null,
	get window () {
		return this._window;
	},
	set window (aVal) {
		this._window = aVal;
	},

	_dropTarget: null,
	get dropTarget() {
		return this._dropTarget;
	},
	set dropTarget(aVal) {
		this._dropTarget = aVal;
	},

	_prevTarget: null,
	get prevTarget() {
		return this._prevTarget;
	},
	set prevTarget(aVal) {
		this._prevTarget = aVal;
	},

	get strings() {
		var strings = LinkpadService.strings;
		this.__defineGetter__("strings", function(){ return strings; });
		return strings;
	},

	get statusText() {
		var statusText = this.strings.get("linkpad.overlay.drop");
		this.__defineGetter__("statusText", function(){ return statusText; });
		return statusText;
	},

	getTypes: function LinkpadDnD_getTypes() {
		var types = ["text/x-linkpad-item", "moz/bookmarkclipboarditem",
		             "text/x-moz-url", "text/x-moz-text-internal", "text/unicode", "text/html"];
		return types;
	},

	setDragOver: function LinkpadDnD_setDragOver(aNode, aEnable, aValue) {
		// set dragover
		if (aEnable) {
			if (aNode.getAttribute("dragover") != aValue) {
				aNode.setAttribute("dragover", aValue);
			}
		}
		// remove dragover
		else {
			aNode.removeAttribute("dragover");
		}
	},

	onDragStart: function LinkpadDnD_onDragStart(aEvent, aXfer, aAction, aItem) {
		// do nothing if we do not have a drag parent
		if (!this.parentNode) {
			return;
		}
		// create transfer data
		aXfer.data = new this.window.TransferData();

		// loop through the types and add to the xfer
		var types = this.getTypes();
		var converter = new LinkpadConverter(aItem);
		for (var i=0; i<types.length; i++) {
			aXfer.data.addDataForFlavour(types[i], converter.get(types[i]));
		}
		// set action to copy if the ctrl key is pressed
		if (aEvent.ctrlKey) {
			aAction.action = Components.interfaces.nsIDragService.DRAGDROP_ACTION_COPY;
		}
	},

	onDragEnter: function LinkpadDnD_onDragEnter(aEvent, aSession) {

		// set the statusbar text
		var el = this.window.top.document.getElementById("statusbar-display");
		el.label = this.statusText;

		// set the dragover attribute
		if (!this.parentNode) {
			this.setDragOver(aEvent.target, true, "true");
		}
	},

	onDragOver: function LinkpadDnD_onDragOver(aEvent, aFlavour, aSession) {
		// set the canDrop
		aSession.canDrop = true;

		// set the action to link if we do not have a parent
		if (!this.parentNode) {
			aSession.dragAction = Components.interfaces.nsIDragService.DRAGDROP_ACTION_LINK;
			return;
		}

		// loop up until the drop target is a listitem or listbox
		var dropTarget = aEvent.target;
		var listbox = dropTarget;
		while (listbox && listbox != this.parentNode) {
			dropTarget = listbox;
			listbox = listbox.parentNode;
		}

		// save the current drop target and clear the variable
		this.prevTarget = this.dropTarget;
		this.dropTarget = null;

		/** target is listbox either we have no children or we are before
		    the first element or after the last element **/
		var value = "bottom";
		var center;
		if (dropTarget == this.parentNode) {

			// no children so set the drop target to null
			if (!this.parentNode.hasChildNodes()) {
				this.dropTarget = null;
			}
			// if mouse is after the center of the lastChild set target to last
			else {
				center = this.parentNode.lastChild.boxObject.y + 
				         (this.parentNode.lastChild.boxObject.height / 2);
				if (aEvent.clientY > center) {
					this.dropTarget = this.parentNode.lastChild;
				}
				else {
					this.dropTarget = this.parentNode.firstChild;
					value = "top";
				}
			}

		// drop target is a list item
		} else {

			// if mouse after center set target to the previous sibling
			center = dropTarget.boxObject.y + (dropTarget.boxObject.height / 2);
			if (dropTarget == this.parentNode.firstChild && (aEvent.clientY < center)) {
				this.dropTarget = dropTarget;
				value = "top";
			}
			else if (aEvent.clientY > center) {
				this.dropTarget = dropTarget;
			}
			else {
				this.dropTarget = dropTarget.previousSibling;
			}
		}

		// remove drag over on the previous target
		if (this.prevTarget && this.dropTarget != this.prevTarget) {
			this.setDragOver(this.prevTarget, false);
		}
		// set drag over on the current target
		if (this.dropTarget) {
			this.setDragOver(this.dropTarget, true, value);
		}
		if (dropTarget == this.parentNode && this.parentNode.hasChildNodes() && 
		                  this.dropTarget.getAttribute("dragover") == "bottom") {
			this.setDragOver(this.dropTarget, false);
		}
	},

	onDragExit: function LinkpadDnD_onDragExit(aEvent, aSession) {

		// clear the statusbar
		var el = this.window.top.document.getElementById("statusbar-display");
		el.label = "";

		// clear the drag over attribute
		this.setDragOver(aEvent.target, false);
		if (this.prevTarget) {
			this.setDragOver(this.prevTarget, false);
			this.prevTarget = null;
		}
		if (this.dropTarget) {
			this.setDragOver(this.dropTarget, false);
			this.dropTarget = null;
		}
	},

	onDrop: function LinkpadDnD_onDrop(aEvent, aXfer, aSession) {
		var converter = new LinkpadConverter(aXfer.data);
		var item = converter.get(aXfer.flavour.contentType);
		return item;
	},

	getFlavours: function LinkpadDnD_getFavours() {
		var flavourSet = new this.window.FlavourSet();
		flavourSet.appendFlavour("text/x-linkpad-item");
		flavourSet.appendFlavour("moz/bookmarkclipboarditem");
		flavourSet.appendFlavour("text/x-moz-url");
		flavourSet.appendFlavour("text/x-moz-text-internal");
		flavourSet.appendFlavour("text/unicode");
		return flavourSet;
	}
};