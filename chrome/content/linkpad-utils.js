Components.utils.import("resource://linkpad/linkpad-module.js");

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
