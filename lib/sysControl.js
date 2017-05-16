var spawn		= require('child_process').spawn;
var comControl  = require('./comControl.js');

function shutdown(data, socket)
{
	console.log("Now Shutdown the server");
	var cmd = 'sudo';
	var args = ['shutdown', '-P', 'now', 'Shutdown by My Hailey Super'];
	child	  = spawn(cmd, args);

	// Broadcast Message
	var json = {type:"ack", eventType: "warn", source:data.action, message : "My Hailey Super is shuting down now!"};
	comControl.broadcast("Notification", json);
}

function reboot(data, socket)
{
	console.log("Now Reboot the server");
	var cmd = 'sudo';
	var args = ['shutdown', '-r', 'now', 'Reboot by My Hailey Super'];
	child	  = spawn(cmd, args);

	// Broadcast Message
	var json = {type:"ack", eventType: "warn", source:data.action, message : "My Hailey Super is rebooting now!"};
	comControl.broadcast("Notification", json);
}

function init(baseDir, channel)
{

}

function proceed(data, socket)
{
	switch (data.action)
	{
		case "shutdown":
			shutdown(data, socket);
			break;
		case "reboot":
			reboot(data, socket);
			break;
		default:
			break;
	}
	return false;
}

exports.init				= init;
exports.proceed				= proceed;
