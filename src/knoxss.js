/*
*/

/* keep track of the extension's state state across the tabs */
var domain_state = {
	/*
	domain: {
		active: true|false,
		xssed: true|false,
		urls: []
	}
	*/
};


function deleteDomainState(domain) {
	domain_state = {};
	browser.storage.local.set({domain_state: domain_state, current_domain: ""});
}

function storeDomainState() {
	browser.storage.local.set({domain_state: domain_state});
}

function setCurrentDomain(domain) {
	browser.storage.local.set({current_domain: domain});
}

function createState(domain) {
	setState(domain, {
		active: false, 
		xssed: false,
		urls: []
	});
	return getState(domain);
}

function hasState(domain) {
	return (domain in domain_state);
}

function getState(domain) {
	return hasState(domain) ? domain_state[domain] : false;
}

function setState(domain, state) {
	if( !(domain in domain_state) ) {
		domain_state[domain] = {};
	}

	for(var k in state) {
		domain_state[domain][k] = state[k];
	}

	storeDomainState();
}

function getOrCreateState(domain) {
	return hasState(domain) ? getState(domain) : createState(domain);
}

/* track newly activated tabs, reflect extension state for this tab in the button UI */
browser.tabs.onActivated.addListener(tabActivated);
function tabActivated(info) {
	var tabs = browser.tabs.get(info.tabId);
	tabs.then((tab) => {
		var domain = getDomainFromURL(tab.url);
		if(isValidDomain(domain)) {
			// ensure a state entry is present for this domain
			var ds = getOrCreateState(domain);
			updateUI(tab, domain, ds);
			setPopupDomain(tab, domain);
		} else {
			console.log("Ignoring activated request on invalid domain \"" + domain + "\"");
			setPopupDomain(tab, "");
			updateUI(tab, domain, false);
		}
	});
}

/* monitor the active tab's "completed" updates */
browser.tabs.onUpdated.addListener(tabUpdate);
function tabUpdate(tabId, changeInfo, tab) {
	if( changeInfo.status == 'complete' ) {
		var currentUrl = tab.url;
		var domain = getDomainFromURL(currentUrl);
		if(isValidDomain(domain)) {
			setPopupDomain(tab, domain);

			var ds = getOrCreateState(domain);
			if( ds.active ) {
				// the extension is active for the specified domain

				// get any previously set cookie for this domain
				browser.cookies.getAll({domain: domain}).then((cookie) => {
					var cookies = '';
					if( cookie.length ) {
						for(var c of cookie) {
							cookies += c.name + "=" + c.value + "; ";
						}
						cookies = "Cookie:" + cookies.trim();
					}

					// query the KNOXSS service
					queryKnoxss(tab, domain, currentUrl, cookies);
				});
			} else {
				updateUI(tab, domain, ds);
			}
		} else {
			console.log("Ignoring update request on invalid domain \"" + domain + "\"");
			setPopupDomain(tab, "");
			updateUI(tab, domain, false);
		}
	}
}

/* listen for incoming messages */
browser.runtime.onMessage.addListener(onMessage);
function onMessage(request, sender, sendResponse) {
	if( request.toggle ) {
		// toggle extension state for the active tab
		toggleState();
		// keep the channel open, we'll async sendResponse
		// return true;
	} else if( request.clear_state ) {
		// clear domain state
		deleteDomainState();
		syncWithActiveTab();
		// return false;
	}
	return false;
}

function  main() {
	console.log("This is LiveKNOXSS " + getVersion());
	syncWithActiveTab();
}

main();


/** Utilities */

/* UI abstraction utilities */

// Stores and signal the specified domain as the currently active one
// so `storage.onChanged` listeners may react accordingly: this only
// succeed if the request comes from the active tab
function setPopupDomain(tab, domain) {
	getActiveTab().then((tabs) => {
		var activeTab = tabs[0];
		if(tab.id == activeTab.id) {
			setCurrentDomain(domain);
		}
	});
}

/* toggle the extension state for the currently active tab */
function toggleState() {
	getActiveTab().then((tabs) => {
		var tab = tabs[0];
		var domain = getDomainFromURL(tab.url);
		if(isValidDomain(domain)) {
			var ds = getOrCreateState(domain);
			ds.xssed = false;
			ds.active = !ds.active;
			setState(domain, ds);
			updateUI(tab, domain, ds);
		} else {
			console.log("Ignoring toggle request on invalid domain \"" + domain + "\"");
		}
	});
}

/* trigger an force a update the state for the currently active tab */
function syncWithActiveTab() {
	getActiveTab().then((tabs) => {
		var tab = tabs[0];
		tabUpdate(tab.id, {status:'complete'}, tab);
	});
}

/* returns the extension version */
function getVersion() {
	return typeof version !== 'undefined' ? ('v' + version) : '(unknown build)';
}

/* gets the domain from the specified URL */
function getDomainFromURL(url) {
	return url.match(/(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/im)[1];
}

function isValidDomain(domain) {
	if(domain.length == 0) return false;
	if(domain.indexOf('.') == -1) return false;
	return true;
}

/* sets text and color for the button badge */
function setBadge(text, color) {
	browser.browserAction.setBadgeText({text:text});
	browser.browserAction.setBadgeBackgroundColor({color:color});
}

/* retrieve the active tab */
function getActiveTab() {
	return browser.tabs.query({active: true, currentWindow: true});
}

// update the browser_action button only if either the request comes from the active tab
// or the domain is the same for both tabs
function updateUI(tab, domain, state) {
	/*
		TODO: use different icons instead of using only one.
		TODO2: verify using both a `browser_action` and a `page_action` is supported
		across browsers (it doesn't look it will be supported on Chrome ;/)

		Currently the KNOXSS icon is used to signal XSS presence as a page action:
		some proper graphics should be done the same as the current badge appears
		on the Toggle toolbar extension's button.
	*/

	getActiveTab().then((tabs) => {
		var activeTab = tabs[0];
		var canUpdate = (activeTab.id == tab.id) || (getDomainFromURL(activeTab.url) === getDomainFromURL(tab.url));
		console.log("active", activeTab);
		console.log("other", tab);
		if( canUpdate ) {
			if(!state || (state && !state.active && !state.xssed)) {
				setBadge("", "");

				browser.pageAction.hide(tab.id);
				console.log("LiveKNOXSS not active for " + (!isValidDomain(domain) ? "invalid domain " : "") + "\"" + domain + "\"");
			} else if( state.active ) {
				setBadge("on", "#FFA500");

				browser.pageAction.hide(tab.id);
				console.log("LiveKNOXSS active for \"" + domain + "\"");
			} else if( state.xssed ) {
				setBadge("XSS", "#FF0000");

				browser.pageAction.show(tab.id);
				console.log("The KNOXSS service found an XSS vulnerability on \"" + domain + "\"!\r\nVulnerable: " + state.urls[0]);
			}
		}
	});
}

function notify(title, text) {
	if(typeof browser.notifications !== 'undefined' && browser.notifications) {
		browser.notifications.create({
			"type": "basic",
			"iconUrl": browser.extension.getURL("icons/k.png"),
			"title": title,
			"message": text
		});
	} else {
		console.log(title + ": " + text);
	}
}

function queryKnoxss(tab, domain, url, cookies) {
	console.log("Querying KNOXSS service for \"" + url + "\", auth=" + cookies + ", tabId=" + tab.id);

	var knoxssUrl = "https://knoxss.me/pro";

	// retrieve KNOXSS cookies
	browser.cookies.getAll({domain: "knoxss.me"}).then((kcookies) => {
		if( kcookies.length ) {
			// collect KNOXSS cookies
			var kauth = '';
			for(var c of kcookies) {
				kauth += c.name + "=" + c.value + "; ";
			}
			kauth = kauth.trim();

			// prepare KNOXSS request headers and body
			var headers = new Headers({
				'Accept': 'text/html,application/xhtml+xml,application/xml',
				'Content-Type': 'application/x-www-form-urlencoded',
				'X-WebExtension': "LiveKNOXSS " + getVersion().replace(/[^0-9A-Za-z\.\-\+]/g,""),
				'Cookie': kauth
			});

			var init = {
				method: "POST",
				body: "target=" + encodeURI(url).replace(/&/g, '%26') + "&auth=" + cookies,
				cache: "no-cache",
				credentials: "include",
				headers: headers
			};

			// make the request
			var knoxssRequest = new Request(knoxssUrl, init);

			fetch(knoxssRequest).then(function(response) {
				return response.text().then(function(body) {
					// XSS found?
					if (body.match(/window.open/)) {
						// extract the vulnerable link for reproduction
						var vulnerable = body.match(/window\.open\('(.[^']*)'/)[1];

						// update state and button UI
						var ds = getState(domain);
						ds.active = false;
						ds.xssed = true;
						ds.urls = [ vulnerable ];
						setState(domain, ds);
						updateUI(tab, domain, ds);

						notify("LiveKNOXSS", "An XSS has been found on " + domain + "!\r\n" + encodeURI(vulnerable));
					}

					if (response.url.match(/knoxss.me\/wp-login\.php/)) {
						notify("LiveKNOXSS", "You have no permission to access this KNOXSS resource.");
					}

					var e = body.match(/ERROR\:.*!/)
					if (e) {
						var t = body.match(/<!--.*-->/)[0];
						if (t) {
							notify("LiveKNOXSS", e + "\n\r" + t.replace(/<!--|-->/g, "", t));
						} else {
							notify("LiveKNOXSS", e);
						}
					}
				});
			});
		} else {
			notify("No KNOXSS service auth cookies found: try to log into the KNOXSS Pro service again.");
		}
	});
}
