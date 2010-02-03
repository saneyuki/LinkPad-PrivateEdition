var Linkpad = {

	get service() {
		delete this.service;
		return this.service = LinkpadService;
	},

	onLoad: function Linkpad_onLoad() {

		// Import JavaScript Compornent code module
		Components.utils.import("resource://linkpad/linkpad-module.js");

		// hookup context listener
		var self = this;
		var context = document.getElementById("contentAreaContextMenu");
		context.addEventListener("popupshowing", function () { self.onPopupShowing(); }, false);

		//set tab context
		this.insertTabMenuItemBefore("linkpad_saveThisTab",
		                             document.getElementById("context_bookmarkAllTabs").nextSibling);
	},

	onUnload: function Linkpad_onUnload() {
	},

	//Control ContentArea's ContextMenuItem
	onPopupShowing: function Linkpad_onPopupShowing() {
		gContextMenu.showItem("linkpad_saveContextLink",
		                      gContextMenu.onSaveableLink);
		gContextMenu.showItem("linkpad_saveThisPage",
		                      !(gContextMenu.isContentSelected || gContextMenu.onTextInput || gContextMenu.onLink ||
		                        gContextMenu.onImage || gContextMenu.onVideo || gContextMenu.onAudio));
	},

	//Add MenuItem to Tab Context Menu
	insertTabMenuItemBefore: function Linkpad_setTabMenuItem(aItemId, aReferenceItem) {
		var tabContextMenu = document.getAnonymousElementByAttribute(gBrowser, "anonid", "tabContextMenu");
		var menuItem = document.getElementById(aItemId);
		tabContextMenu.insertBefore(menuItem, aReferenceItem);
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