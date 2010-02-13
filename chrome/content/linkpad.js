var Linkpad = {

	_service: null,
	get service() {
		if (!this._service) {
			this._service = LinkpadService;
		}
		return this._service;
	},

	handleEvent: function (aEvent) {
		switch (aEvent.type) {
			case "load":
				this.onLoad();
				break;
			case "popupshowing":
				this.onPopupShowing();
				break;
			case "unload":
				this.onUnLoad();
				break;
		}
	},

	onLoad: function Linkpad_onLoad() {
		window.removeEventListener("load", this, false);
		window.addEventListener("unload", this, false);

		// Import JavaScript Compornent code module
		Components.utils.import("resource://linkpad/linkpad-module.js");

		// hookup context listener
		var context = document.getElementById("contentAreaContextMenu");
		context.addEventListener("popupshowing", this, false);

		//set tab context
		this.insertAllToTabCtx("linkpad_tabContext",
		                       document.getElementById("context_bookmarkAllTabs").nextSibling);
	},

	onUnLoad: function Linkpad_onUnload() {
		window.removeEventListener("unload", this, false);

		var context = document.getElementById("contentAreaContextMenu");
		context.removeEventListener("popupshowing", this, false);
	},

	//Control ContentArea's ContextMenuItem
	onPopupShowing: function Linkpad_onPopupShowing() {
		gContextMenu.showItem("linkpad_saveContextLink",
		                      gContextMenu.onSaveableLink);
		gContextMenu.showItem("linkpad_saveThisPage",
		                      !(gContextMenu.isContentSelected || gContextMenu.onTextInput || gContextMenu.onLink ||
		                        gContextMenu.onImage || gContextMenu.onVideo || gContextMenu.onAudio));
	},

	insertAllToTabCtx: function AddDToUnsortBkm_insertAllToTabCtx(aId, aReference) {
		var itemsParent = document.getElementById(aId);
		while (itemsParent.hasChildNodes()) {
			var node = itemsParent.firstChild;
			this.insertToTabCtxBefore(node, aReference);
		}
	},

	insertToTabCtxBefore: function AddDToUnsortBkm_insertToTabCtxBefore(aElem, aReference) {
		var tabContextMenu = document.getAnonymousElementByAttribute(gBrowser, "anonid", "tabContextMenu");
		tabContextMenu.insertBefore(aElem, aReference);
	},

	//This function's old name is "saveContext()"
	saveContextLink: function Linkpad_saveContextLink() {
		urlSecurityCheck(gContextMenu.linkURL, gContextMenu.target.ownerDocument.nodePrincipal);
		this.saveItem(gContextMenu.linkURL, gContextMenu.linkText());
	},

	//Save This Page as Item from ContentArea's ContextMenu
	saveThisPage: function Linkpad_saveThisPage() {
		this.saveTab(gBrowser.mCurrentTab);
	},

	//Save Tab as Item from TabBar
	saveThisTab: function Linkpad_saveThisTab() {
		this.saveTab(gBrowser.mContextTab);
	},

	saveTab: function Linkpad_saveTab(aTab) {
		var URI = aTab.linkedBrowser.currentURI.spec;
		var title = aTab.linkedBrowser.contentDocument.title || aTab.getAttribute("label");
		this.saveItem(URI, title);
	},

	//This function's old name is "SaveLink()"
	saveItem: function Linkpad_saveItem(aURI, aTitle) {
		this.service.createItem(aURI, aTitle, 0);
	},
};
window.addEventListener("load", Linkpad, false);
