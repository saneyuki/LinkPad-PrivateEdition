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
		this.SetTabMenuItem();
	},

	onUnload: function Linkpad_onUnload() {
	},

	//Control ContentArea's ContextMenuItem
	onPopupShowing: function Linkpad_onPopupShowing() {
		var menuitem_context = document.getElementById("linkpad_saveContextLink");
		if (gContextMenu.onSaveableLink) {
			menuitem_context.removeAttribute("hidden");
		}
		else {
			menuitem_context.setAttribute("hidden", "true");
		}

		var menuitem_page = document.getElementById("linkpad_saveThisPage");
		if (!(gContextMenu.isContentSelected || gContextMenu.onTextInput ||
			  gContextMenu.onLink ||gContextMenu.onImage ||
			  gContextMenu.onVideo || gContextMenu.onAudio)) {
			menuitem_page.removeAttribute("hidden");
		}
		else {
			menuitem_page.setAttribute("hidden", "true");
		}
	},

	//Add MenuItem to Tab Context Menu
	SetTabMenuItem: function Linkpad_SetTabMenuItem() {
		var strbundle = document.getElementById("linkpad_bundle");
		var itemlabel = strbundle.getString("linkpad.overlay.tab");
		var tabContextMenu = document.getAnonymousElementByAttribute(gBrowser, "anonid", "tabContextMenu");
		var item = document.createElement("menuitem");

		item.setAttribute("id", "linkpad_saveThisTab");
		item.setAttribute("label", itemlabel);
		item.setAttribute("oncommand", "Linkpad.saveThisTab();");

		var node = document.getElementById('context_bookmarkAllTabs').nextSibling;
		tabContextMenu.insertBefore(item, node);
		/*
		var separator = document.createElement("menuseparator");
		separator.setAttribute("id", "linkpad_separator-tab");
		tabContextMenu.insertBefore(separator, Node);
		*/
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