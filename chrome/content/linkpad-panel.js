/*******************************************************************************
 * Main object that interacts between the user and the backend.
 ******************************************************************************/
var LinkpadPanel = {

	// nsIObserver
	observe: function LinkpadPanel_observe(aSubject, aTopic, aData) {
		if (aTopic == "netscape-linkpad") {
			var self = this;
			window.setTimeout(function() {
				try {
					self[aData](aSubject);
				}
				catch(e) {}
			}, 0);
		}
		else if (aTopic == "nsPref:changed" && aData == "openClickCount") {
			var count = this.branch.get("openClickCount");
			this.listbox.setAttribute("clickcount", String(count));
		}
	},

	_service: null,
	get service() {
		if (!this._service) {
			this._service = LinkpadService;
		}
		return this._service;
	},

	get domain() {
		return "extensions.netscape.linkpad.";
	},

	_branch: null,
	get branch() {
		if (!this._branch) {
			this._branch = (new Preferences(this.domain));
		}
		return this._branch;
	},

	get clipboard() {
		delete this.clipboard;
		return this.clipboard = (new LinkpadClipboard());
	},
  
	get dnd() {
		delete this.dnd;
		return this.dnd = (new LinkpadDnD(this.listbox));
	},

	get listbox() {
		return document.getElementById("linkpad_listbox");
	},

	handleEvent: function (aEvent) {
		switch (aEvent.type) {
			case "load":
				this.onLoad();
				break;
			case "unload":
				this.onUnLoad();
				break;
		}
	},

	onLoad: function LinkpadPanel_onLoad() {
		window.removeEventListener("load", this, false);
		window.addEventListener("unload", this, false);

		// Import JavaScript Compornent code module.
		Components.utils.import("resource://linkpad/Utils.js");

		// hookup the command controller
		this.listbox.controllers.appendController(this);

		// hookup pref observer
		this.branch.observe("", this);
		var count = this.branch.get("openClickCount");
		this.listbox.setAttribute("clickcount", String(count));

		// add ourself to the observer service
		Observers.add("netscape-linkpad", this);

		// load the listbox and focus it
		this.loadListbox();
		this.setSelection();
		this.listbox.focus();
	},

	onUnLoad: function LinkpadPanel_onUnload() {
		window.removeEventListener("unload", this, false);

		// unhook the command controller
		this.listbox.controllers.removeController(this);
		this.dnd.parentNode = null;

		// remove the observer
		this.branch.ignore("", this);
		Observers.remove("netscape-linkpad", this);

		// remove variables
		this.clipboard = null;
		this.dnd = null;
	},

	loadListbox: function LinkpadPanel_loadListbox() {
		var listbox = this.listbox;

		// fill listbox
		var items = this.service.getItems();
		var index = 0;
		while (index < items.length) {
			var item = items[index];
			this.createItem(item);
			index++;
		}
	},

	createItem: function LinkpadPanel_createItem(aItem) {
		this.createNode(aItem);
	},

	updateItem: function LinkpadPanel_updateItem(aItem) {
		this.deleteItem(aItem);
		this.createItem(aItem);
	},

	deleteItem: function LinkpadPanel_deleteItem(aItem) {
		var node = document.getElementById(aItem.ID + "_listitem");
		if (!node) {
			return;
		}
		node.parentNode.removeChild(node);
	},

	clearItems: function LinkpadPanel_clearItems() {
		var listbox = this.listbox;
		while (listbox.hasChildNodes()) {
			listbox.removeChild(listbox.lastChild);
		}
	},

	createNode: function LinkpadPanel_createNode(aItem) {
		var ID = aItem.ID;

		// create the list item
		var node = document.createElement("listitem");
		node.setAttribute("id", ID + "_listitem");
		node.setAttribute("itemid", ID);
		node.setAttribute("class", "linkpad-item listitem-iconic");
		node.setAttribute("label", aItem.title);
		node.setAttribute("value", aItem.URL);
		//node.setAttribute("tooltiptext", aItem.URL);
		node.setAttribute("onmouseover", "LinkpadPanel.fillInTooltip(event);");
		node.setAttribute("sortIndex", String(aItem.sortIndex));

		// add to dom document
		this.addNode(node);
	},

	fillInTooltip: function LinkpadPanel_fillInTooltip(aEvent) {
		var target = aEvent.target;
		var Title = target.getAttribute("label");
		var URI = target.getAttribute("value");

		var tooltipTitle = document.getElementById("LinkPadPanel_tTitleText");
		tooltipTitle.hidden = (Title == URI);
		if (!tooltipTitle.hidden) {
			tooltipTitle.textContent = Title;
		}

		var tooltipUrl = document.getElementById("LinkPadPanel_tUrlText");
		tooltipUrl.value = URI;

		target.setAttribute("tooltip", "LinkPadPanel_Tooltip");
	},

	addNode: function LinkpadPanel_addNode(aNode) {

		// append since we have no children
		var parent = this.listbox;
		if (!parent.hasChildNodes()) {
			parent.appendChild(aNode);
			return;
		}

		// append since the sort index is greater than the last child's
		var child = parent.lastChild;
		var childIndex = Number(child.getAttribute("sortIndex"));
		var sortIndex = Number(aNode.getAttribute("sortIndex"));
		if (sortIndex >= childIndex) {
			parent.appendChild(aNode);
			return;
		}

		// insert before the first because sort index is less than first child's
		child = parent.firstChild;
		childIndex = Number(child.getAttribute("sortIndex"));
		if (sortIndex <= childIndex) {
			parent.insertBefore(aNode, child);
			return;
		}

		// loop through the children
		while (child) {

			// last node so leave
			var next = child.nextSibling;
			if (!next) {
				break;
			}
			// sort index is in between so insert before next
			childIndex = Number(child.getAttribute("sortIndex"));
			var nextIndex = Number(next.getAttribute("sortIndex"));
			if (childIndex <= sortIndex && nextIndex >= sortIndex) {
				parent.insertBefore(aNode, next);
				return;
			}

			// set the current to the next
			child = next;
		}

		// could not find the correct position so append
		parent.appendChild(aNode);
	},

	getInsertionPoint: function LinkpadPanel_getInsertionPoint(aTarget) {
		var listbox = this.listbox;
		var sortIndex = 0;

		// no target so append
		if (!aTarget) {
			sortIndex = 0;
		}
		// target is last child so append
		else if (aTarget == listbox.lastChild) {
			sortIndex = 0;
		}
		// target is the first child and dropping before
		else if (aTarget == listbox.firstChild &&
		                   (listbox.firstChild.getAttribute("dragover") == "top")) {
			sortIndex = Number(listbox.firstChild.getAttribute("sortIndex"))/2;
		}
		else {
			var current = Number(aTarget.getAttribute("sortIndex"));
			var next = Number(aTarget.nextSibling.getAttribute("sortIndex"));
			sortIndex = current + ((next-current)/2);
		}

		return sortIndex;
	},

	openLink: function LinkpadPanel_openLink(aOverride) {
		var item = this.listbox.selectedItem;
		if (!item) {
			return;
		}
		var where = (!aOverride) ? this.determineWhere(): aOverride;
		if (this.branch.get("removeLinkOnOpen")) {
			this.setSelection(item);
			this.service.deleteItem(item.getAttribute("itemid"));
		}

		openUILinkIn(item.value, where);
		window.content.focus();
	},

	copyLink: function LinkpadPanel_copyLink() {
		var item = this.listbox.selectedItem;
		if (!item) {
			return;
		}
		item = this.service.getItem(item.getAttribute("itemid"));
		this.clipboard.onCopy(item);
	},

	pasteLink: function LinkpadPanel_pasteLink() {
		var item = this.clipboard.onPaste();
		if (!isValidLinkpadItem(item)) {
			return;
		}
		var sortIndex = this.getInsertionPoint(this.listbox.selectedItem);
		this.service.createItem(item.URL, item.title, sortIndex);
	},

	removeLink: function LinkpadPanel_removeLink() {
		var item = this.listbox.selectedItem;
		this.setSelection(item);
		this.service.deleteItem(item.getAttribute("itemid"));
	},

	determineWhere: function LinkpadPanel_determineWhere() {
		var prefVal = this.branch.get("open");
		var where = "current";
		switch (prefVal) {
			case 3:
				where = "tab";
				break;
			case 2:
				where = "window";
				break;
			case 1:
			default:
				where = "current";
				break;
		}
		return where;
	},

	checkClick: function LinkpadPanel_checkClick(aEvent, aCount) {
		if (aEvent.originalTarget.localName != "listitem") {
			return;
		}
		if ((aEvent.button !== 0) && (aEvent.button != 1)) {
			return;
		}
		if (aCount != this.branch.get("openClickCount")) {
			return;
		}
		this.openLink();
	},

	setSelection: function LinkpadPanel_setSelection(aItem) {
		var listbox = this.listbox;
		if (listbox.getRowCount() === 0) {
			listbox.clearSelection();
			return;
		}

		if (!aItem) {
			listbox.selectItem(listbox.getItemAtIndex(0));
			return;
		}

		var next = listbox.getNextItem(aItem, 1);
		if (!next) {
			next = listbox.getPreviousItem(aItem, 1);
		}
		if (!next) {
			listbox.clearSelection();
		}
		else {
			listbox.selectItem(next);
		}
	},

	confirmClear: function LinkpadPanel_confirmClear() {
		var dontAsk = !this.branch.get("showClear");
		if (dontAsk) {
			return true;
		}
		var title = this.dnd.strings.get("linkpad.panel.clear.title");
		var message = this.dnd.strings.get("linkpad.panel.clear.message");
		var show = this.dnd.strings.get("linkpad.panel.clear.show");

		var prompt = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
		             .getService(Components.interfaces.nsIPromptService);
		var checkbox = { value: false };
		var clear =  prompt.confirmCheck(window, title, message, show, checkbox);
		if (!clear) {
			return false;
		}
		this.branch.set("showClear", !checkbox.value);
		return true;
	},

	// nsIController
	supportsCommand: function LinkpadPanel_supportsCommand(aId) {
		switch (aId) {
			case "cmd_cut":
			case "cmd_copy":
			case "cmd_paste":
			case "cmd_delete":
			case "linkpad_open":
			case "linkpad_openWin":
			case "linkpad_openTab":
			case "linkpad_clear":
				return true;
			default:
				return false;
		}
	},

	isCommandEnabled: function LinkpadPanel_isCommandEnabled(aId) {
		var listbox = this.listbox;
		switch (aId) {
			case "cmd_cut":
			case "cmd_copy":
			case "cmd_delete":
			case "linkpad_open":
			case "linkpad_openWin":
			case "linkpad_openTab":
				return (listbox.selectedItem !== null);
			case "cmd_paste": 
				return this.clipboard.hasData();
			case "linkpad_clear":
				return (listbox.getRowCount() > 0);
			default:
				return false;
		}
	},

	doCommand: function LinkpadPanel_doCommand(aId) {
		switch (aId) {
			case "cmd_cut":
			this.copyLink();
				this.removeLink();
				break;
			case "cmd_copy":
				this.copyLink();
				break;
			case "cmd_paste":
				this.pasteLink();
				break;
			case "cmd_delete":
				this.removeLink();
				break;
			case "linkpad_open":
				this.openLink();
				break;
			case "linkpad_openWin":
				this.openLink("window");
				break;
			case "linkpad_openTab":
				this.openLink("tab");
				break;
			case "linkpad_clear":
				if (this.confirmClear()) {
					this.service.clearItems();
				}
				break;
			default:
				return;
				break;
		}
	},

	onEvent: function LinkpadPanel_onEvent(aName) {
		goUpdateGlobalEditMenuItems();
		goUpdateCommand("linkpad_open");
		goUpdateCommand("linkpad_openWin");
		goUpdateCommand("linkpad_openTab");
		goUpdateCommand("linkpad_clear");  
	},

	// nsDragAndDrop
	onDragStart: function LinkpadPanel_onDragStart(aEvent, aXfer, aAction) {
		var item = this.listbox.selectedItem;
		if (!item) {
			return;
		}
		item = this.service.getItem(item.getAttribute("itemid"));
		this.dnd.onDragStart(aEvent, aXfer, aAction, item);
	},

	onDragEnter: function LinkpadPanel_onDragEnter(aEvent, aSession, aAction) {
		this.dnd.onDragEnter(aEvent, aSession, aAction);
	},

	onDragOver: function LinkpadPanel_onDragOver(aEvent, aFlavour, aSession) {
		this.dnd.onDragOver(aEvent, aFlavour, aSession);
	},

	onDragExit: function LinkpadPanel_onDragExit(aEvent, aSession) {
		// clear the statusbar
		var el = window.top.document.getElementById("statusbar-display");
		el.label = "";
	},

	onDrop: function lp_onDrop(aEvent, aXfer, aSession) {
		var item = this.dnd.onDrop(aEvent, aXfer, aSession);
		if (!isValidLinkpadItem(item)) {
			return;
		}
		// text/x-linkpad-item
		var sortIndex = this.getInsertionPoint(this.dnd.dropTarget);
		if (item.ID !== null && 
		    aSession.dragAction == Components.interfaces.nsIDragService.DRAGDROP_ACTION_MOVE) {
			this.service.deleteItem(item.ID);
		}
		// insert the item
		this.service.createItem(item.URL, item.title, sortIndex);

		// clear the drag over attribute
		this.dnd.setDragOver(aEvent.target, false);
		if (this.dnd.prevTarget) {
			this.dnd.setDragOver(this.dnd.prevTarget, false);
			this.dnd.prevTarget = null;
		}
		if (this.dnd.dropTarget) {
			this.dnd.setDragOver(this.dnd.dropTarget, false);
			this.dnd.dropTarget = null;
		}
		aEvent.stopPropagation();
	},

	getSupportedFlavours: function lp_getSupportedFavours() {
		return this.dnd.getFlavours();
	},

	buildContextMenu: function LinkpadPanel_buildContextMenu(aEvent) {

		var target = aEvent.explicitOriginalTarget;
		if (target.localName == "listitem") {
			this.listbox.selectItem(target);
		}

		// setup variables
		var separator = null;
		var command = null;
		var visibleItemsBeforeSep = false;
		var anyVisible = false;

		// loop through the context menu
		var popup = aEvent.target;
		for (var i=0; i<popup.childNodes.length; ++i) {

			// get the menuitem
			var item = popup.childNodes[i];

			// determine if item should be visible
			if (item.localName != "menuseparator") {
				command = document.getElementById(item.getAttribute("command"));
				item.hidden = command.hasAttribute("disabled");

				// item is visible mark variables as such
				if (!item.hidden) {
					visibleItemsBeforeSep = true;
					anyVisible = true;

					// show the separator above the menu-item if any
					if (separator) {
						separator.hidden = false;
						separator = null;
					}
				}
			}

			// menuseparator
			else {

				// initially hide it. It will be unhidden if there will be at least one
				// visible menu-item above and below it.
				item.hidden = true;

				// we won't show the separator at all if no items are visible above it
				if (visibleItemsBeforeSep) {
					separator = item;
				}
				// new separator, count again:
				visibleItemsBeforeSep = false;
			}
		}

		return anyVisible;
	}
};
window.addEventListener("load", LinkpadPanel, false);