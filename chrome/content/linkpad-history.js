var LinkpadHistory = {
/*
	handleEvent: function (aEvent) {
		switch (aEvent.type) {
			case "load":
				this.onLoad();
				break;
		}
	},

	onLoad: function Linkpad_onLoad() {
		window.removeEventListener("load", this, false);
	},
*/
	saveContext: function Linkpad_saveContext() {
		// no need to check gHistoryTree.view.selection.count
		// node will be null if there is a multiple selection
		// or if the selected item is not a URI node
		var node = gHistoryTree.selectedNode;

		if (node && PlacesUtils.nodeIsURI(node) && !PlacesUIUtils.checkURLSecurity(node)) {
			return;
		}

		if (node && PlacesUtils.nodeIsURI(node)) {
			window.parent.Linkpad.saveItem(node.uri, node.title);
		}
	}
};
//window.addEventListener("load", LinkpadHistory, false);