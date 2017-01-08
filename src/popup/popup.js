// coded by dudez
// https://twitter.com/therealdudez

var ui_icon = document.querySelector('img#icon');
var ui_domain = document.querySelector('#domain');
var ui_state = document.querySelector('#state');
var ui_toggle = document.querySelector('#toggle');
var ui_results = document.querySelector('#results');
var ui_title = document.querySelector('#title');
var ui_linktext = document.querySelector('#linktext');
var ui_view = document.querySelector('#view');
var ui_copy = document.querySelector('#copy');
var ui_versioninfo = document.querySelector('#versioninfo');
var ui_opennewtab = document.querySelectorAll('.open-newtab');

/* force links to open in new tabs */
for(var e of ui_opennewtab) {
	e.onclick = function(e) {
		// open new tab
		browser.tabs.create({url: this.href});

		// close the popup
		window.close();
		return false;
	}
}

/* Utilities */
function getVersion() {
	return typeof version !== 'undefined' ? ('v' + version) : '(unknown build)';
}

function setText(e, text) {
	e.textContent = text;
}

function setHtml(e, html) {
	e.innerHTML = html;
}

function getActiveTab() {
	return browser.tabs.query({active: true, currentWindow: true});
}

function hide(e) {
	e.class = "hidden";
	e.style.display = "none";
}

function show(e) {
	e.class = "";
	e.style.display = "";
}

function updateUI(data) {
	ui_icon.src = browser.extension.getURL('icons/k.png');
	setHtml(ui_versioninfo, "LiveKNOXSS <strong>" + getVersion() + "</strong>");

	if ( !data.knoxssState || !data.knoxssCurrentDomain ) {
		// no state for this domain
		setHtml(ui_domain, "<span class='unsupported'>Unsupported domain.</span>");
		setHtml(ui_state, "LiveKNOXSS can't be activated here.");
		ui_toggle.value = "(disabled)";
		ui_toggle.disabled = true;
		hide(ui_toggle);
		hide(ui_results);
	} else {
		var domain = data.knoxssCurrentDomain;
		var state = data.knoxssState[domain];

		// dbg
		// state.active = false;
		// state.xssed = true;
		// state.urls = ['http://yahoo.com'];

		show(ui_toggle);
		hide(ui_results);

		// domain
		var c = state.xssed ? "xssed" : "domain";
		setHtml(ui_domain, "<span class='" + c + "'>" + domain + "</span>");

		// state
		if( state.active ) {
			setHtml(ui_state, "LiveKNOXSS is <span class='active'>ACTIVE</span>.");
		} else {
			if( state.xssed ) {
				setHtml(ui_state, "LiveKNOXSS deactivated due to XSS found.");
			} else {
				setHtml(ui_state, "LiveKNOXSS is <span class='inactive'>NOT</span> active.");
			}
		}

		// toggle
		ui_toggle.disabled = false;
		if( state.active ) {
			setHtml(ui_toggle, "Click to <strong class='inactive'>DEACTIVATE</strong>");
		} else {
			setHtml(ui_toggle, "Click to" + (state.xssed ? " reset and" : "") + " <strong class='active'>ACTIVATE</strong>");
		}

		if( state.xssed ) {
			show(ui_results);
			setHtml(ui_title, "<span class='xss'>An XSS has been found!</span>");
			var url = state.urls[0];
			ui_linktext.value = url;
			ui_view.href = url;
		} else {
			setText(ui_title, state.active ? "No XSS found yet." : "");
			ui_linktext.value = '';
			ui_view.href = '';
		}
	}
}

function reload() {
	browser.storage.local.get(["knoxssState", "knoxssCurrentDomain"]).then(data => {
		updateUI(data);
	});
}

/* tell the background script to toggle the extension for this domain */
ui_toggle.onclick = function(e) {
	browser.runtime.sendMessage({toggle: true}).then(
		function(response) {
			if( response.toggled ) {
				reload()
			}
		},
		function(error) {
			console.log("Error toggling", error);
		}
	);
}

/* copy to clipboard */
ui_copy.onclick = function(e) {
	ui_linktext.select();
	document.execCommand("copy");
}

reload();