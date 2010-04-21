/*******************************************************************************
 * Import JavaScript Compornent code module.
 ******************************************************************************/
Components.utils.import("resource://linkpad/linkpad-module.js");
Components.utils.import("resource://linkpad/UtilsForExtension.js");

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

		var rv = new Object();
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
	this._board = Components.classes["@mozilla.org/widget/clipboard;1"]
	              .getService(Components.interfaces.nsIClipboard);
}
LinkpadClipboard.prototype = {
	_board: null,

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
function LinkpadDnD(aParent) {
	this.parentNode = aParent;
}
LinkpadDnD.prototype = {

	_parentNode: null,
	get parentNode() {
		return this._parentNode;
	},
	set parentNode(aVal) {
		this._parentNode = aVal;
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

	_statusText: null,
	get statusText() {
		if (!this._statusText) {
			this._statusText = this.strings.get("linkpad.overlay.drop");
		}
		return this._statusText;
	},

	_strings: null,
	get strings() {
		if (!this._strings) {
			this._strings = (new StringBundle("chrome://linkpad/locale/linkpad.properties"));
		}
		return this._strings;
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
		aXfer.data = new TransferData();

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
		var el = window.top.document.getElementById("statusbar-display");
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
		var el = window.top.document.getElementById("statusbar-display");
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
		var flavourSet = new FlavourSet();
		flavourSet.appendFlavour("text/x-linkpad-item");
		flavourSet.appendFlavour("moz/bookmarkclipboarditem");
		flavourSet.appendFlavour("text/x-moz-url");
		flavourSet.appendFlavour("text/x-moz-text-internal");
		flavourSet.appendFlavour("text/unicode");
		return flavourSet;
	}
};
/*******************************************************************************
 * Helper function to determine if the converted linkpad item is valid.
 ******************************************************************************/
function isValidLinkpadItem(aItem) {
	function isURL(aString) {
		var regexp = /(ftp:\/\/|http:\/\/|https:\/\/|gopher:\/\/|file:\/\/|about:)(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
		return regexp.test(aString);
	}

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
	if (isURL(aItem.URL)) {
		return true;
	}
	return false;
}