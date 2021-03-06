var LinkpadPlaces = {

	get service() {
		delete this.service;
		return this.service = LinkpadService;
	},

	handleEvent: function (aEvent) {
		switch (aEvent.type) {
			case "load":
				this.onLoad();
				break;
		}
	},

	onLoad: function Linkpad_onLoad() {
		window.removeEventListener("load", this, false);

		// Import JavaScript Compornent code module.
		Components.utils.import("resource://linkpad/linkpad-module.js");
	},

	saveItem: function Linkpad_saveItem(aURI, aTitle) {
		this.service.createItem(aURI, aTitle, 0);
	},

	saveContext: function Linkpad_saveContext() {
		/*
		 * no need to check gHistoryTree.view.selection.count
		 * node will be null if there is a multiple selection
		 * or if the selected item is not a URI node
		 */
		var node = PlacesUIUtils.getViewForNode(document.popupNode).selectedNode;

		if (node && PlacesUtils.nodeIsURI(node) && !PlacesUIUtils.checkURLSecurity(node)) {
			return;
		}

		if (node && PlacesUtils.nodeIsURI(node)) {
			this.saveItem(node.uri, node.title);
		}
	}
};
window.addEventListener("load", LinkpadPlaces, false);