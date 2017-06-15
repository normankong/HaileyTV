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
var log4js		= require('log4js')

log4js.configure(config.LOG4JS_CONFIG);
var logger		= log4js.getLogger();

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
	logger.info('My Hailey Super started on port ' + app.get('port'));
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
		comControl.broadcastStatus(socket);
	});

	socket.on("syscontrol", function(data)
	{
		logger.info("=============================================");
		logger.info("Incoming System Control Request", data);
		logger.info("=============================================");

		// Trigger the Proceed. Send Status Update if necessary
		var isStatusUpdate = sysControl.proceed(data, socket);

		// Update Current System Status if necessary
		if (isStatusUpdate) comControl.broadcastStatus();
	});

	socket.on("songcontrol", function(data)
	{
		logger.info("=============================================");
		logger.info("Incoming Song Control Request", data);
		logger.info("=============================================");

		// Trigger the Proceed. Send Status Update if necessary
		var isStatusUpdate = songControl.proceed(data, socket);

		// Update Current System Status if necessary
		if (isStatusUpdate) comControl.broadcastStatus();
	});
});
