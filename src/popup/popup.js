/*
	The Popup script responsible to show information associated with
	a domain: it's synchronized wi
*/

var ui_icon = document.querySelector('img#icon');
var ui_domain = document.querySelector('#domain');
var ui_state = document.querySelector('#state');
var ui_toggle = document.querySelector('#toggle');
var ui_result = document.querySelector('#result');
var ui_title = document.querySelector('#title');
var ui_linktext = document.querySelector('#linktext');
var ui_view = document.querySelector('#view');
var ui_copy = document.querySelector('#copy');
var ui_versioninfo = document.querySelector('#versioninfo');
var ui_opennewtab = document.querySelectorAll('.open-newtab');
var ui_domainlist = document.querySelector('div#domainlist');
var ui_domdivider = document.querySelector('#domdivider');
var ui_resultset = document.querySelector('#resultset');
var ui_clearstate = document.querySelector('#clearstate');

// force links to open in new tabs
for(var e of ui_opennewtab) {
	e.onclick = function(e) {
		// open new tab
		browser.tabs.create({url: this.href});

		// close the popup
		window.close();
		return false;
	}
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

/* UI abstraction utilities */

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

function showResult(url) {
	show(ui_result);
	show(ui_resultset);
	ui_linktext.value = url;
	ui_view.href = url;
}

function hideResult() {
	hide(ui_result);
	hide(ui_resultset);
	ui_linktext.value = '';
	ui_view.href = '';
}

function copyResultLinkToClipboard() {
	ui_linktext.select();
	document.execCommand("copy");
}

function showDomainList(domain_state, domain) {
	show(ui_domainlist);
	show(ui_domdivider);

	var html = '<h4>Domains seen this session:</h4>';
	for(var d in domain_state) {
		var s = domain_state[d];
		var currenttab = (d === domain) ? ' current-tab ' : '';
		var active = s.active ? ' isactive ' : '';
		var xssed = s.xssed ? ' xssed ' : '';
		html += '<div class="domainitem ' + currenttab +'">';
		html += '<input disabled type=checkbox data-domain="' + d + '" ' + (s.active ? 'checked' : '') + '/>';
		html += '<span class="' + xssed + active + '">' + d + '</span>';
		html += '</div>';
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
	hideResult();
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

		// domain
		setDomain("<span class='" + (state.xssed ? "xssed" : "domain") + "'>" + domain + "</span>");

		if( state.active ) {
			showTitle("No XSS found yet.");	
			setState("LiveKNOXSS is <span class='active'>ACTIVE</span>.");
			enableToggle("Click to <strong class='inactive'>DEACTIVATE</strong>");
		} else if( state.xssed ) {
			showTitle("<span class='xss'>An XSS has been found!</span>");
			setState("LiveKNOXSS deactivated due to XSS found.");
			enableToggle("Click to <em>reset</em> and <strong class='active'>re-ACTIVATE</strong>");
			showResult(state.urls[0]);
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

/* copy to clipboard */
ui_copy.onclick = function(e) {
	copyResultLinkToClipboard();
}

/* sync UI to data changes */
browser.storage.onChanged.addListener((changes, area) => { reload(); });

/* trigger a UI reload */
reload();
