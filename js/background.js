// Directory paths
var IMAGE_BASE = "../images/";

// Browser icon names
var QFLOW_ACTIVE = IMAGE_BASE + "qflow_active.png";
var QFLOW_CLOSED = IMAGE_BASE + "qflow_closed.png";
var QFLOW_ERROR  = IMAGE_BASE + "qflow_error.png";
var QFLOW_PAUSED = IMAGE_BASE + "qflow_paused.png";

// URL to request
var QFLOW_URL = "http://834s-qflow-pa.its.unimelb.edu.au/QFlow/Tools/ServiceConsole.aspx";

// Settings
var pushbulletID, pushbulletDevice, selDevice;
selDevice = -1;

// Do we have an active qflow tab open in chrome?
var qflowActive = false;
// Ignore tickets?
var isEnabled = true;
// Pushbullet signed in?
var isAuth = false;

// List of tickets notifications have been sent for
var ticketList = [];

// Load settings
chrome.storage.sync.get({
	apiKey: "",
	device: ""
}, function(items) {
	pushbulletID = items.apiKey;
	pushbulletDevice = items.device;
	
	// Check if we actually loaded anything
	if (pushbulletID.length != 0 && pushbulletDevice.length != 0) {
		console.log("Loaded API key as " + pushbulletID);
		console.log("Loaded device as " + pushbulletDevice);
		
		// Initialise Pushbullet
		PushBullet.APIKey = pushbulletID;
		devices = PushBullet.devices();
		for(var i = 0; i < devices.devices.length; i++) {
			// Nickname is sometimes null. I think that happens on disabled
			// devices.
			if (!devices.devices[i].nickname) {
				console.log("Skipping disabled device.");
				continue;
			}

			if (devices.devices[i].nickname.toLowerCase().indexOf(pushbulletDevice.toLowerCase()) > -1) {
				selDevice = i;
				console.log("Using " + devices.devices[i].nickname + " (Device " + i + ")");
				isAuth = true;
				break;
			} else {
				console.log("'" + devices.devices[i].nickname + "' is not '" + pushbulletDevice + "'");
			}
		}
	}

	// Check if QFlow is open
	checkQflowOpen();
	// We want our icon to be right more often than we want to spam the QFlow servers
	setInterval(function () {
		checkQflowOpen();
	}, 1000);
	
	setInterval(function () {
		// We need an open Qflow tabs for our requests to be authenticated
		// so make sure there is one open.
		if (qflowActive) {
			// Request stats from QFlow
			var xhr = new XMLHttpRequest();
			xhr.open("GET", QFLOW_URL, true);
			xhr.send();
			
			xhr.onreadystatechange = function() {
				// Process stats
				if (xhr.readyState == 4 && xhr.status == 200) {
					var response = xhr.responseText;
					
					// Use regular expressions to find if we have any tickets.
					// Could load into DOM but then it resolves all external
					// resources which causes fun errors due to relative
					// resource links.
					var exp = /class='ProcessListLink'>(.{4})<\/a>/g
					// Match all tickets in response
					while((match = exp.exec(response)) != null) {
						// match[1] is the captured group (ticket number)
						var ticketNumber = match[1];
						
						// If we're yet to see this ticket, notify the user
						if (ticketList.indexOf(ticketNumber) < 0) {
							// Record that we've sent the current ticket
							// We'll probably get duplicate announcements and
							// we don't want to annoy people by passing this
							// information on.
							ticketList.push(ticketNumber);
							console.log("Received ticket " + ticketNumber);
							
							// Fetch current time
							var cD = new Date();
							var timeStr = String("0" + cD.getHours()).slice(-2) + ":" + String("0" + cD.getMinutes()).slice(-2) + ":" + String("0" + cD.getSeconds()).slice(-2);
							
							// Send desktop and mobile notifications
							notifyDesktop(timeStr, ticketNumber);
							if (isEnabled)
								notifyMobile(timeStr, ticketNumber);
							else
								console.log("Suppressed mobile notification.");
						}
					}
				}
			}
		} else {
			console.log("No active QFlow tab. Please log in to QFlow in a new tab.");
		}
	}, 5000);
	
	// Pause notifications if user clicks on extension icon
	chrome.browserAction.onClicked.addListener(function (tab) {
		if (isEnabled) {
			isEnabled = false;
			console.log("Notifications paused.");
		} else {
			isEnabled = true;
			console.log("Notifications un-paused.");
		}
	});
});

// Query to see if any open tabs match the qflow URL
function checkQflowOpen() {
		chrome.tabs.query({url: "http://834s-qflow-pa.its.unimelb.edu.au/*"},
			function(tabs) {
				if (tabs.length > 0) {
					qflowActive = true;
				} else {
					qflowActive = false;
				}
				
				// isEnabled is true if notifications are allowed to be sent
				if (!qflowActive) {
					chrome.browserAction.setIcon({path: QFLOW_CLOSED});
				} else if (qflowActive && !isEnabled && isAuth) {
					chrome.browserAction.setIcon({path: QFLOW_PAUSED});
				} else if (qflowActive && isEnabled && isAuth) {
					chrome.browserAction.setIcon({path: QFLOW_ACTIVE});
				} else {
					chrome.browserAction.setIcon({path: QFLOW_ERROR});
				}
		} );
}

// Send a chrome desktop notification
function notifyDesktop(timeStr, ticketNumber) {
	try {
		var opt = {
			iconUrl: QFLOW_CLOSED,
			type: 'basic',
			title: 'QFlow Ticket',
			message: 'New ticket received at ' + timeStr + ' (' + ticketNumber + ')',
			priority: 1,
		};
                    
		chrome.notifications.create('qflow_' + timeStr,
									opt,
									function() { });
	} catch (err) {
		console.log("Could not send desktop notification: " + err.message);
	}
}

// Send a Pushbullet notification to the device the user selected during setup
function notifyMobile(timeStr, ticketNumber) {
	try {
		PushBullet.push("note", devices.devices[selDevice].iden, null, {title: "QFlow Ticket", body: 'New ticket received at ' + timeStr + ' (' + ticketNumber + ')'});
	}
	catch (err) {
		console.log("Could not send mobile notification: " + err.message);
	}
}

// Show the user the options page if first run
chrome.runtime.onInstalled.addListener(function(details){
    if(details.reason == "install"){
        chrome.runtime.openOptionsPage();
    }
});
