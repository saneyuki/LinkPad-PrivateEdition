var LinkpadPlaces = {

	_service: null,
	get service() {
		if (!this._service) {
			this._service = LinkpadService;
		}
		return this._service;
	},

	onLoad: function Linkpad_onLoad() {
		// Import JavaScript Compornent code module.
		Components.utils.import("resource://linkpad/linkpad-module.js");
		
		// Insert "Save Link to Link Pad" before the cut item
		var pContext = document.getElementById("placesContext");
		var pContext_cut = document.getElementById("placesContext_cut");
		pContext.insertBefore(document.getElementById("linkpad_saveContext-places"), pContext_cut);
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
		var node = document.getElementById("placeContent").selectedNode;

		if (node && PlacesUtils.nodeIsURI(node) && !PlacesUIUtils.checkURLSecurity(node)) {
			return;
		}

		if (node && PlacesUtils.nodeIsURI(node)) {
			this.saveItem(node.uri, node.title);
		}
	}
};
