// URL to request
qflowUrl = "http://834s-qflow-pa.its.unimelb.edu.au/QFlow/Tools/ServiceConsole.aspx";

// Settings key to store extension version
var VERSION_ID = "version";

// Settings
var pushbulletID, pushbulletDevice, selDevice;
selDevice = -1;

// Do we have an active qflow tab open in chrome?
qflowActive = false;

// List of tickets notifications have been sent for
var ticketList = [];

// Check if QFlow is open
checkQflowOpen();

// Initialise Pushbullet
PushBullet.APIKey = pushbulletID;
devices = PushBullet.devices();
for(var i = 0; i < devices.devices.length; i++) {
	if (devices.devices[i].nickname.toLowerCase().indexOf(pushbulletDevice.toLowerCase()) > -1) {
		selDevice = i;
		console.log("Using " + devices.devices[i].nickname + " (Device " + i + ")");
		break;
	} else {
		console.log("'" + devices.devices[i].nickname + "' is not '" + pushbulletDevice + "'");
	}
}

setInterval(function () {
	// We need an open Qflow tabs for our requests to be authenticated
	// so make sure there is one open.
	checkQflowOpen();
	if (qflowActive) {
		// Request stats from QFlow
		var xhr = new XMLHttpRequest();
		xhr.open("GET", qflowUrl, true);
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
						notifyMobile(timeStr, ticketNumber);
					}
				}
			}
		}
	} else {
		console.log("No active QFlow tab. Please log in to QFlow in a new tab.");
	}
}, 5000);

// Query to see if any open tabs match the qflow URL
function checkQflowOpen() {
		chrome.tabs.query({url: "http://834s-qflow-pa.its.unimelb.edu.au/*"},
			function(tabs) {
				if (tabs.length > 0)
					qflowActive = true;
				else
					qflowActive = false;
		} );
}

function notifyDesktop(timeStr, ticketNumber) {
	try {
		var opt = {
			iconUrl: "icon.jpg",
			type: 'basic',
			title: 'QFlow Ticket',
			message: 'New ticket received at ' + timeStr + '(' + ticketNumber + ')',
			priority: 1,
		};
                    
		chrome.notifications.create('qflow_' + timeStr,
									opt,
									function() { });
	} catch (err) {
		console.log("Could not send desktop notification: " + err.message);
	}
}

function notifyMobile(timeStr, ticketNumber) {
	try {
		PushBullet.push("note", devices.devices[selDevice].iden, null, {title: "QFlow Ticket", body: 'New ticket received at ' + timeStr + '(' + ticketNumber + ')'});
	}
	catch (err) {
		console.log("Could not send mobile notification: " + err.message);
	}
}