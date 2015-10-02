$(document).ready(function() {
	restoreOptions();
	$("#step2").css("display", "none");
	$("#step3").css("display", "none");
	$("#step4").css("display", "none");
	
	$("#next").click(function() {
		$("#step1").css("display", "none");
		$("#step2").css("display", "flex");
		
		// Check to see if inputted access token is valid
		var token = $("#pushbulletID").val();
		
		// Try to retrieve devices for inputted API key	
		PushBullet.APIKey = token;
		var devices = PushBullet.devices(function(err, res) {
			if(err) {
				$("#step1").css("display", "block");
				$("#step2").css("display", "none");
				
				showError("Your API key is invalid, try a different key.");
			} else {
				// Display devices for user to select from a combo box
				displayDevices(res.devices);
				// Hide progress bar and show combo box
				$("#step2").css("display", "none");
				$("#step3").css("display", "block");
			}
		});
	});
	
	$("#save").click(function() {
		var device = $("#pushbulletDevice").val();
		if (device != null) {
			// Save the users selection
			saveOptions();
			// Show 'finished' dialogue
			$("#step3").css("display", "none");
			$("#step4").css("display", "flex");
		} else {
			showError("You need to select a device.");
		}
	});
});

function displayDevices(devices) {
	for(var i = 0; i < devices.length; i++) {
		var nick = devices[i].nickname;
		
		$('#pushbulletDevice').append($('<option>', { 
			value: nick,
			text : nick 
		}));
	}
}

function saveOptions() {
	var key = $("#pushbulletID").val();
	var device = $("#pushbulletDevice").val();
	
	chrome.storage.sync.set({
		apiKey: key,
    	device: device
	}, function() {
		// Update status to let user know options were saved.
		alert("Saved.");
		chrome.runtime.reload();
		chrome.tabs.getCurrent(function(tab) {
			chrome.tabs.remove(tab.id, function() { });
		});
  });
}

function restoreOptions() {
	chrome.storage.sync.get({
		apiKey: ""
	}, function(items) {
		$("#pushbulletID").val(items.apiKey);
  });
}

function showError(msg) {
	var $div = $('<div />').appendTo('body');
	$div.attr('id', 'error');
	$div.append("<h1>" + msg + "</h1>");
	$div.append("<button id=\"close\">Close</button>");
	
	$("#close").click(function() {
		$("#error").remove();
	});
}