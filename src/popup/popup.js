// coded by dudez
// https://twitter.com/therealdudez

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
var ui_cleardomains = document.querySelector('#cleardomains');

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

/* abstraction utilities */

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

function showDomainList(domain_state) {
	show(ui_domainlist);
	show(ui_domdivider);

	var html = '<h4>Domains seen this session:</h4>';
	for(var d in domain_state) {
		var s = domain_state[d];
		html += '<div class="domainitem">';
		html += '<label><input disabled type=checkbox data-domain="' + d + '" ' + (s.active ? 'checked' : '') + '/><span>' + d + '</span>';
		html += '</div>';
		// console.log(d);
	}

	setHtml(ui_domainlist, html);
}

function hideDomainList() {
	setHtml(ui_domainlist, "");
	hide(ui_domainlist);
	hide(ui_domdivider);
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
}

// update the UI to reflect the state of the specified data
function updateUI(data) {
	setIcon('icons/k.png');
	setVersionInfo(getVersion());

	resetUI();

	if( !data.knoxssState ) {
		// no state
		setDomain("<span class='unsupported'>Unknown domain.</span>");
		setState("LiveKNOXSS can't be activated here.");
	} else {
		// domain list
		if( Object.keys(data.knoxssState).length ) {
			showDomainList(data.knoxssState);
		}
	}

	if( !data.knoxssCurrentDomain ) {
		// no domain set
		setDomain("<span class='unsupported'>Unsupported domain.</span>");
		setState("LiveKNOXSS can't be activated here.");
	} else {
		var domain = data.knoxssCurrentDomain;
		var state = data.knoxssState[domain];

		// dbg
		// state.xssed = true;
		// state.urls = ['http://yahoo.com'];

		// domain
		setDomain("<span class='" + (state.xssed ? "xssed" : "domain") + "'>" + domain + "</span>");

		// state
		setState( 
			state.active ? "LiveKNOXSS is <span class='active'>ACTIVE</span>."
			: state.xssed ? "LiveKNOXSS deactivated due to XSS found."
			: "LiveKNOXSS is <span class='inactive'>NOT</span> active."
		);

		// toggle
		enableToggle( state.active 
			? "Click to <strong class='inactive'>DEACTIVATE</strong>" 
			: "Click to" + (state.xssed ? " reset and" : "") + " <strong class='active'>ACTIVATE</strong>"
		);

		// title, results
		if(state.active) {
			showTitle("No XSS found yet.");	
		} else if( state.xssed ) {
			showResult(state.urls[0]);
			showTitle("<span class='xss'>An XSS has been found!</span>");
		}
	}
}

/* load storage and update UI */
function reload() {
	browser.storage.local.get(["knoxssState", "knoxssCurrentDomain"]).then((data) => {
		updateUI(data);
	});
}

/* tell the background script to toggle the extension for this domain */
ui_toggle.onclick = function(e) {
	browser.runtime.sendMessage({toggle: true});
}

/* tell the background script to reset the domains state */

ui_cleardomains.onclick = function(e) {
	browser.runtime.sendMessage({clear_state: true});
}

/* copy to clipboard */
ui_copy.onclick = function(e) {
	copyResultLinkToClipboard();
}

/* reload data and update UI whenever it changes */
browser.storage.onChanged.addListener((changes, area) => { reload(); });

/* kick-off a programmatic */
reload();
