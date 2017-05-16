var host	= document.location.origin;
var socket  = io.connect(host);

socket.on('connect', function(data)
{
	socket.emit('RemoteController',{action:"initialize"});

	socket.on("SystemStatus", function(data)
	{
		console.log("=============================================");
		console.log("Incoming System Status");
		console.log(data);
		console.log("=============================================");

		var panelStatus = data.panelStatus
		// Format Song Panel
		showSongPanel(panelStatus.running);

		// Show Channel Name
		var channelName = data.channelName;
		$("#channelName").html("Channel : " + channelName);

		// Display the Song List under this Channel 
		$('#songpanel_content').empty();
		var songList    = data.songList;
		$(songList).each(function(item, value)
		{
			var filename	= value.filename;
			var songname	= value.songname;
			var thumnail	= value.thumnail;
			var className   = value.isPlaying ? "playing" : "normal";

			var data = {};
				data.filename	 = filename;

			var jsonObj =
			{
				data			: escapeHtml(JSON.stringify(data)),
				songname		: songname,
				thumbnail		: thumnail,
				className       : className
			};

			var template = $('#videoTpl').html();
			var html	 = Mustache.to_html(template, jsonObj);
			$("#songpanel_content").append(html);
		 });

		// Init the Song Event when Song is clicked
		$(".watch").on("click",function(){
			var name = $(this).data('name');
			if (name == null) return;
			var data = JSON.parse(decodeEntities(name));
			var json =
				{
					action		: "watch",
					filename   	:  data.filename
				}
			console.log("Emitting : ", json);
			socket.emit('songcontrol', json);
			return ;
		});


		// Display Channel List
		var node = $('#menu_channel').next()
		while (node.hasClass("channel"))
		{
			node.remove();
			node = $('#menu_channel').next();
		}

		var channelList = data.channelList;
		$(channelList).each(function(item, value)
		{
			var channelName	= value.channelName;

			var data = {};
				data.channelName = channelName;
			var className		 = value.isPlaying ? "playing" : "normal";

			var jsonObj =
			{
				data			: escapeHtml(JSON.stringify(data)),
				channelName		: channelName,
				className		: className
			};

			var template = $('#channelTpl').html();
			var html	 = Mustache.to_html(template, jsonObj);
			$('#menu_channel').after(html);
		 });

		// Update Menu Bar
		$('nav#menu').mmenu({
			drag 		: true,
			pageScroll 	: {
				scroll 		: true,
				update		: true
			},
			extensions	: {
				'(min-width: 800px)': [ 'widescreen' ]
			}
		});

		// Init the Click Event when the Channel is click
		$(".channelLink").on("click",function(){
			var name = $(this).data('name');
			if (name == null) return;
			var data = JSON.parse(decodeEntities(name));
			var json =
				{
					action		: "switchChannel",
					channelName :  data.channelName,
					autoPlay	:  true
				}
			console.log("Emitting : ", json);
			socket.emit('songcontrol', json);
		});
	})
	socket.on("Notification", function(data)
	{
		console.log("Incoming Message", data);
		var source    = data.source;
		var message   = data.message;
		var eventType = data.eventType;
		$("#notification").notify(data.message, eventType);
	});
});

// Song Control
$(".startSong").on("click",function(){
	var json = {action : "start"}
	console.log("Emitting : ", json);
	socket.emit('songcontrol', json);
});

$(".stopSong").on("click",function(){
	var json = {action : "stop"}
	console.log("Emitting : ", json);
	socket.emit('songcontrol', json);
});

$(".pause").on("click",function(){
	var json = {action : "pause"}
	console.log("Emitting : ", json);
	socket.emit('songcontrol', json);
	showPlayPanel(true);
});

$(".play").on("click",function(){
	var json = {action : "play"}
	console.log("Emitting : ", json);
	socket.emit('songcontrol', json);
	showPlayPanel(false);
});

$(".backward").on("click",function(){
	var json = {action : "backward"}
	console.log("Emitting : ", json);
	socket.emit('songcontrol', json);
	showPlayPanel(false);
});

$(".forward").on("click",function(){
	var json = {action : "forward"}
	console.log("Emitting : ", json);
	socket.emit('songcontrol', json);
	showPlayPanel(false);
});

$(".previous").on("click",function(){
	var json = {action : "previous"}
	console.log("Emitting : ", json);
	socket.emit('songcontrol', json);
	showPlayPanel(false);
});

$(".next").on("click",function(){
	var json = {action : "next"}
	console.log("Emitting : ", json);
	socket.emit('songcontrol', json);
	showPlayPanel(false);
});


function showPlayPanel(value)
{
	if (value)
	{
		$(".pause").hide();
		$(".play").show();
	}
	else
	{
		$(".pause").show();
		$(".play").hide();
	}
}

function showSongPanel(value)
{
	if (value)
	{
		$("#header").removeClass("stop").addClass('playing');
		$("#footer").removeClass("stop").addClass('playing');
	}
	else
	{
		$("#header").removeClass("playing").addClass('stop');
		$("#footer").removeClass("playing").addClass('stop');
	}
}