/*
	The Popup script responsible to show information associated with
	a domain.
*/

var ui_icon = document.querySelector('img#icon');
var ui_domain = document.querySelector('#domain');
var ui_state = document.querySelector('#state');
var ui_toggle = document.querySelector('#toggle');
var ui_title = document.querySelector('#title');
var ui_copy = document.querySelector('#copy');
var ui_versioninfo = document.querySelector('#versioninfo');
var ui_opennewtab = document.querySelectorAll('.open-newtab');
var ui_domainlist = document.querySelector('div#domainlist');
var ui_domdivider = document.querySelector('#domdivider');
var ui_results = document.querySelector('#results');
var ui_resultset = document.querySelector('#resultset');
var ui_clearstate = document.querySelector('#clearstate');

// force marked links to open in new tabs
for(var e of ui_opennewtab) {
	makeOpenNewTabLink(e);
}

/* low-level utilities */

function hide(e) {
	e.class = "hidden";
	e.style.display = "none";
	return e;
}

function show(e) {
	e.class = "";
	e.style.display = "";
	return e;
}

function enable(e) {
	e.disabled = false;
	return e;
}

function disable(e) {
	e.disabled = true;
	return e;
}

function getVersion() {
	return typeof version !== 'undefined' ? ('v' + version) : '(unknown build)';
}

function setText(e, text) {
	e.textContent = text;
	return e;
}

function setHtml(e, html) {
	e.innerHTML = html;
	return e;
}

function hasKeys(o) {
	if( typeof o !== 'undefined' && o ) {
		return Object.keys(o).length;
	}
	return false;
}

/* UI utilities, mostly abstractions */

function makeOpenNewTabLink(e) {
	e.onclick = function(e) {
		// open new tab
		browser.tabs.create({url: this.href});

		// close the popup
		window.close();
		return false;
	}
}

function setVersionInfo(version) {
	setHtml(ui_versioninfo, " <strong>" + version + "</strong>");
}

function setIcon(iconResource) {
	ui_icon.src = browser.extension.getURL(iconResource);
	return e;
}

function setDomain(domain) {
	setHtml(ui_domain, domain);
}

function setState(state) {
	setHtml(ui_state, state);
}

function disableToggle() {
	hide(disable(setHtml(ui_toggle, "(disabled)")));
}

function enableToggle(html) {
	show(enable(setHtml(ui_toggle, html)));
}

function showTitle(html) {
	show(setHtml(ui_title, "&nbsp;" + html + "&nbsp;"));
}

function hideTitle() {
	setHtml(ui_title, "");
	hide(ui_title);
}

function showResults(urls) {
	if( urls && urls.length ) {
		show(ui_results);
		show(ui_resultset);

		var linktexts = "";
		var linktools = "";
		for(var id in urls) {
			// create and append elements
			var url = urls[id];
			linktexts += '<input class="linktext" id="linktext' + id +'" readonly value="' + url.replace(/"/g, '&quot;') + '" />';
			linktools += '<a id="linkview' + id + '" href="javascript:">view</a><br/><a id="linkcopy' + id + '" href="javascript:">copy</a><br/>';
		}

		// attach them to the DOM
		setHtml(ui_results, "<tr><td>" + linktexts + "</td><td>" + linktools + "</td></tr>");

		// attach event handlers
		for(var id in urls) {
			// open vulnerable link in new tab
			var url = urls[id];
			var linkview = document.querySelector('#linkview' + id);
			linkview.href = url;
			makeOpenNewTabLink(linkview);

			// copy link
			var linktext = document.querySelector('#linktext' + id);
			var linkcopy = document.querySelector('#linkcopy' + id);
			linkcopy.onclick = (function(element) {
				return function(e) {
					element.select();
					document.execCommand('copy');
					return false;
				}
			})(linktext);
		}
	}
}

function hideResults() {
	setHtml(ui_results, "");
	hide(ui_results);
	hide(ui_resultset);
}

function showDomainList(domain_state, domain) {
	show(ui_domainlist);
	show(ui_domdivider);

	var html = '<h4>Domains seen this session:</h4>';
	for(var d in domain_state) {
		var s = domain_state[d];
		var currenttab = (d === domain) ? ' current-tab ' : '';
		var active = s.active ? ' active ' : '';
		var xssed = s.xssed ? ' xssed ' : '';
		html += '<div class="domainitem ' + currenttab + active + xssed + '"><span>'+d+'</span></div>';
	}

	setHtml(ui_domainlist, html);
}

function hideDomainList() {
	setHtml(ui_domainlist, "");
	hide(ui_domainlist);
	hide(ui_domdivider);
}

function showClearState() {
	show(ui_clearstate);
}

function hideClearState() {
	hide(ui_clearstate);
}

// resets the UI to a minimal state, only the icon, the
// domain and the state are shown
function resetUI() {
	show(ui_icon);
	show(ui_domain);
	show(ui_state);

	disableToggle();
	hideResults();
	hideTitle();
	hideDomainList();
	hideClearState();
}

// update the UI to reflect the state of the specified data
function updateUI(data) {
	setIcon('icons/k.png');
	setVersionInfo(getVersion());

	resetUI();

	var domain = data.current_domain;
	var states = data.domain_state;

	if( !states ) {
		setDomain("<span class='unsupported'>No data.</span>");
		setState("LiveKNOXSS can't be activated here.");
	} else if( !domain ) {
		setDomain("<span class='unsupported'>Unsupported domain.</span>");
		setState("LiveKNOXSS can't be activated here.");
	}

	// domain list
	if( hasKeys(data.domain_state) ) {
		showDomainList(data.domain_state, domain ? domain : false);
		showClearState();
	}

	if( states && domain ) {
		var state = states[domain];

		// dbg
		// state.xssed = true;
		// state.urls = [
		// 	'http://test.domain.com/xss.php?c"4=1"-"confirm`1`-"#KNOXSS',
		// 	'http://test.domain.com/xss.php?c"4=1"-"confirm`1`-"#KNOXSS',
		// 	'http://test.domain.com/xss.php?c"4=1"-"confirm`1`-"#KNOXSS'
		// ];

		// domain
		setDomain("<span class='domain " + (state.xssed ? "xssed" : state.active ? "active" : "") + "'>" + domain + "</span>");

		if( state.active ) {
			showTitle("No XSS found yet.");	
			setState("LiveKNOXSS is <span class='active'>ACTIVE</span>.");
			enableToggle("Click to <strong>DEACTIVATE</strong>");
		} else if( state.xssed ) {
			showTitle("<span class='xss'>XSS found on this domain!</span>");
			setState("LiveKNOXSS deactivated due to XSS found.");
			enableToggle("Click to <em>reset</em> and <strong class='active'>re-ACTIVATE</strong>");
			showResults(state.urls);
		} else {
			setState("LiveKNOXSS is <span class='inactive'>NOT</span> active.");
			enableToggle("Click to <strong class='active'>ACTIVATE</strong>");
		}
	}
}

/* load storage and update UI */
function reload() {
	browser.storage.local.get(["domain_state", "current_domain"]).then((data) => {
		updateUI(data);
	});
}

/* request to toggle the extension for this domain */
ui_toggle.onclick = function(e) {
	browser.runtime.sendMessage({toggle: true});
}

/* tell the background script to reset the domains state */

ui_clearstate.onclick = function(e) {
	browser.runtime.sendMessage({clear_state: true});
}


/* sync UI to data changes */
browser.storage.onChanged.addListener((changes, area) => { reload(); });

/* trigger a UI reload */
reload();
