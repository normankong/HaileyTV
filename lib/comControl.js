var songControl = require('./songControl.js');
var sysControl  = require('./sysControl.js');

var ssList = null;			// Support Multiple Remote Controller	

function init()
{
	ssList = [];
}

function connect(socket)
{
	console.log('Connection Event received');
	ssList[ssList.length] = socket;
	console.log("Totally number of connection : " + ssList.length);
}

function disconnect(socket)
{
	console.log('Disconnected Event received');
	for (var i = 0; i < ssList.length ; i++)
	{
		if (ssList[i] == socket)
		{
			console.log("Disonnect " + (i+1) + "/" + ssList.length);
			ssList.splice(i, 1);
		}
	}
	console.log("Totally number of connection : " + ssList.length);
}

function broadcast(eventType, data, socket)
{
	// For Single Channel
	if (socket != null)
	{
		console.log("Send " + eventType + " to single connections", data);
		socket.emit(eventType, data);
		return;
	}

	// For All Channel
	console.log("Send " + eventType + " to " + ssList.length + " connections", data);
	for (var i = 0; i < ssList.length ; i++)
	{
		var ss = ssList[i];
			ss.emit(eventType, data);
	}
}

function broadcastStatus(socket)
{
	var songControlStatus = songControl.getStatus();
	var sysControlStatus  = sysControl.getStatus();
	
	var result = Object.assign({},songControlStatus, sysControlStatus);
	broadcast("Status", result, socket);
}

exports.init				= init;
exports.connect				= connect;
exports.disconnect			= disconnect;
exports.broadcast  			= broadcast;
exports.broadcastStatus		= broadcastStatus;
