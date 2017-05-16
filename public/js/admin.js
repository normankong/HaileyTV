var host	= document.location.origin;
var socket  = io.connect(host);

var GOOGLE_API_KEY = "AIzaSyD0EGAzxEMcPu4Njt-GKwZzLNDgGVCw06o";

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

		// Format Air TIme
		var airTime = data.panelStatus.airTime;
		var isAutoStart = (airTime != 0)

		clock = $('.clock').FlipClock( airTime / 1000, {
			clockFace: 'HourlyCounter',
			autoStart : isAutoStart
		});

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
				data.isPlaying	 = value.isPlaying;

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
			var isPlaying = data.isPlaying;

			if (isPlaying)
			{
				var message   = "This song is playing. Cannot delete.";
				$("#notification").notify(message, "error");
				return;
			}

			if (confirm("Are you sure you want to delete this Song ?"))
			{
				var json =
					{
						action		: "deleteSong",
						filename   	:  data.filename
					}
				console.log("Emitting : ", json);
				socket.emit('songcontrol', json);
			}
			return ;
		});
		
		// Show Channel Name
		var channelName = data.channelName;
		$("#channelName").html("Channel : " + channelName);
		$("#channelName").attr("ChannelName", channelName);

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
					autoPlay    :  false
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

function deleteChannel()
{
	var channelName = $("#channelName").attr("ChannelName");
	if (confirm("Are you sure you want to delete " + channelName + "?"))
	{
		var json =
		{
			action		: "deleteChannel",
			channelName :  channelName
		}
		console.log("Emitting : ", json);
		socket.emit('songcontrol', json);
	}
}

function openCreateChannelDialog()
{
	var object = $("#newChannelName");
	object.removeClass( "ui-state-error" );
	object.val("");
	$( "#dialog-form" ).dialog( "open" );
}

function createChannel()
{
	var object = $("#newChannelName");
	var newChannelName = object.val();
	var regExp = new RegExp("^([A-Za-z]|[0-9])+$");
	if (newChannelName.length >= 3 && regExp.test(newChannelName))
	{
		if (confirm("Are you sure you want to create " + newChannelName + "?"))
		{
			var json =
			{
				action		: "createChannel",
				channelName :  newChannelName
			}
			console.log("Emitting : ", json);
			socket.emit('songcontrol', json);

			$( "#dialog-form" ).dialog( "close" );	
		}
	}
	else
	{
		var message   = "Channel Name is not a valid Format. It should be at least 3 character with either alphanumberic character only";
		$("#notification").notify(message, "error");
		object.addClass( "ui-state-error" );
	}
}


// Initialization Method
$( function() {

	// Initialize Dialog
	var dialog = 
	$( "#dialog-form" ).dialog({
	  autoOpen: false,
	  height: 180,
	  width: 280,
	  modal: false,
	  buttons: {
		"Create" : function (){
			createChannel();
		},
		Cancel: function() {
		  dialog.dialog( "close" );
		}
	  }
	});

	// Song Control
	$(".startSong").on("click",function(){
		var json = {action : "start"}
		console.log("Emitting : ", json);
		socket.emit('songcontrol', json);
	});

	$(".stopSong").on("click",function(){
		debugger
		var json = {action : "stop"}
		console.log("Emitting : ", json);
		socket.emit('songcontrol', json);
	});

	$(".create").on("click",function(){
		setTimeout("openCreateChannelDialog()", 500);
	});

	$(".delete").on("click",function(){
		deleteChannel();
	});

	// Sys Control
	$(".reboot").on("click",function(){
		if (confirm("Are you sure you want to reboot ? "))
		{
			var json = {action : "reboot"}
			console.log("Emitting : ", json);
			socket.emit('syscontrol', json);
		}
	});

	$(".shutdown").on("click",function(){
		if (confirm("Are you sure you want to shutdown ? "))
		{
			var json = {action : "shutdown"}
			console.log("Emitting : ", json);
			socket.emit('syscontrol', json);
		}
	});
});