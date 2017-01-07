// coded by dudez
// https://twitter.com/therealdudez

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

	browser.storage.local.set({knoxssState: domain_state});
}

function removeState(domain) {
	delete domain_state[domain];
}

function getOrCreateState(domain) {
	return hasState(domain) ? getState(domain) : createState(domain);
}

function setCurrentDomain(domain) {
	browser.storage.local.set({knoxssCurrentDomain: domain});
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
			setCurrentDomain(domain);
		} else {
			console.log("Ignoring activated request on invalid domain \"" + domain + "\"");
			setCurrentDomain("");
			updateUI(tab, domain, false);
		}
	});
}

/* button clicked, show popup for the currently active tab */

browser.runtime.onMessage.addListener(onMessage);
function onMessage(request, sender, sendResponse) {
	if( request.toggle ) {
		toggleState(sendResponse);
	}

	// keep the channel open, we'll async sendResponse
	return true;
}

function toggleState(sendResponse) {
	getActiveTab().then((tabs) => {
		var tab = tabs[0];
		var domain = getDomainFromURL(tab.url);
		if(isValidDomain(domain)) {
			var ds = getOrCreateState(domain);
			ds.xssed = false;
			ds.active = !ds.active;
			setState(domain, ds);
			updateUI(tab, domain, ds);
			// respond back if asked to
			if( sendResponse ) {
				sendResponse({toggled: true});
			}
		} else {
			console.log("Ignoring toggle request on invalid domain \"" + domain + "\"");
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
			setCurrentDomain(domain);

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
			setCurrentDomain("");
			updateUI(tab, domain, false);
		}
	}
}

function main() {
	console.log("This is LiveKNOXSS " + getVersion());
	/* update the state for the currently active tab */
	getActiveTab().then(tabs => {
		var tab = tabs[0];
		tabUpdate(tab.id, {status:'complete'}, tab);
	});
}

main();


/** Utilities */

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

/* update the button state for the specified tab */
function updateUI(tab, domain, state) {
	if(!state || (state && !state.active && !state.xssed)) {
		setBadge("", "");
		// browser.pageAction.hide(tab.id);
		console.log("LiveKNOXSS not active for " + (!isValidDomain(domain) ? "invalid domain " : "") + "\"" + domain + "\"");
	} else if( state.active ) {
		setBadge("on", "#FFA500");
		// browser.pageAction.show(tab.id);
		console.log("LiveKNOXSS active for \"" + domain + "\"");
	} else if( state.xssed ) {
		setBadge("XSS", "#FF0000");
		console.log("The KNOXSS service found an XSS vulnerability on \"" + domain + "\"!\r\nVulnerable: " + state.urls[0]);
	}
}

function notify(title, text) {
	if(typeof browser.notifications !== 'undefined') {
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
				'Cookie': kauth
			});

			var init = {
				method: "POST",
				body: "target=" + encodeURI(url).replace(/&/g, '%26') + "&auth=" + cookies,
				cache: "no-cache",
				credentials: "include",
				headers: headers
			};
			// console.log(init);

			var ds = getState(domain);

			var knoxssRequest = new Request(knoxssUrl, init);
			fetch(knoxssRequest).then(function(response) {
				return response.text().then(function(body) {
					// console.log(body);

					// XSS found?
					if (body.match(/window.open/)) {
						// extract the vulnerable link for reproduction
						var vulnerable = body.match(/window\.open\('(.[^']*)'/)[1];

						// update state and button UI
						ds.active = false;
						ds.xssed = true;
						ds.urls = [ vulnerable ];
						setState(domain, ds);
						updateUI(tab, domain, ds);

						// extract the payload result from the result page body
						var payload = body.match(/window.open.*height=600\'\)/)[0];
						notify("LiveKNOXSS", "An XSS has been found on " + domain + "!\r\n" + encodeURI(vulnerable));

						// inject the original "window.open" call as it appears in the
						// source code and ensure the location is our matched argument
						// browser.tabs.executeScript(tab.id, { 
							// code: "window.open('" + vulnerable + "', '', 'top=90, left=260, width=900, height=600');"
						// });
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
			console.log("No KNOXSS service auth cookies found: try to log into the KNOXSS Pro service again.");
		}
	});
}
