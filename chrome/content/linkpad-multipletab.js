var LinkpadMultipleTab = {

	handleEvent: function (aEvent) {
		switch (aEvent.type) {
			case "load":
				this.onLoad();
				break;
		}
	},

	onLoad: function LinkpadMultipleTab_onLoad() {
		window.removeEventListener("load", this, false);

		this.ChangeInsertionPoint();
		this.removeTabItem();
	},

	ChangeInsertionPoint: function LinkpadMultipleTab_ChangeInsertPoint() {
		var item = document.getElementById("linkpad_saveSelectedTabs-multipletab-selection");
		var multiple_selection = document.getElementById("multipletab-selection-menu");

		multiple_selection.insertBefore(item, document.getElementById("multipletab-selection-duplicate-separator"));
	},

	removeTabItem: function LinkpadMultipleTab_removeTabItem() {
		var tabContextMenu = document.getAnonymousElementByAttribute(gBrowser, "anonid", "tabContextMenu");
		tabContextMenu.removeChild(document.getElementById("linkpad_saveThisTab"));
	},

	//Save Selected Tabs from TabBar, When use Extension: Multiple Tab Handler.
	saveSelectedTabs: function LinkpadMultipleTab_saveSelectedTabs() {
		MultipleTabService.getSelectedTabs().forEach(function(aTab) {
			Linkpad.saveItem(aTab.linkedBrowser.currentURI.spec,
			                 aTab.linkedBrowser.contentDocument.title || aTab.getAttribute("label"));
		});
	}
};
window.addEventListener("load", LinkpadMultipleTab, false);