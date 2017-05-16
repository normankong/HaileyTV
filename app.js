/**
 * Module dependencies.
 */
var express		= require('express');
var app			= express()  ;
var server		= require('http').createServer(app);
var path		= require('path');
var io			= require('socket.io').listen(server);
var songControl = require('./lib/songControl.js');
var comControl  = require('./lib/comControl.js');
var sysControl  = require('./lib/sysControl.js');
var config      = require("./config/config.json");

// All environments
app.set('port', config.HTTP_PORT_NUMBER);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));

//Routes Default
app.get('/', function (req, res) 
{
  res.sendfile(__dirname + '/public/index.html');
});

// Initialize and make sure Port is reachable
server.listen(app.get('port'), function()
{
	console.log('My Hailey Super started on port ' + app.get('port'));
	comControl.init();
	sysControl.init();
	songControl.init();
});

//Socket.io Server
io.origins('*:*');
io.sockets.on('connection', function (socket) 
{
	socket.on('disconnect', function () 
	{
		comControl.disconnect(socket);
	});

	socket.on("RemoteController", function()
	{
		comControl.connect(socket);

		// Update Current System Status
		updateSystemStatus(socket);
	});

	socket.on("syscontrol", function(data)
	{
		console.log("=============================================");
		console.log("Incoming System Control Request", data);
		console.log("=============================================");

		// Trigger the Proceed. Send Status Update if necessary
		var isStatusUpdate = sysControl.proceed(data, socket);

		// Update Current System Status if necessary
		if (isStatusUpdate) updateSystemStatus();
	});

	socket.on("songcontrol", function(data)
	{
		console.log("=============================================");
		console.log("Incoming Song Control Request", data);
		console.log("=============================================");

		// Trigger the Proceed. Send Status Update if necessary
		var isStatusUpdate = songControl.proceed(data, socket);

		// Update Current System Status if necessary
		if (isStatusUpdate) updateSystemStatus();
	});
});

function updateSystemStatus(socket)
{
	var systemStatus = songControl.getSongControlStatus();
	comControl.broadcast("SystemStatus", systemStatus, socket);
}