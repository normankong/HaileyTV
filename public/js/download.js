var host	= document.location.origin;
var socket  = io.connect(host);

var GOOGLE_API_KEY = null;

socket.on('connect', function(data)
{
	socket.emit('RemoteController',{action:"initialize"});

	var Youtube = 
	{
		getVideo: function(query, socket, type)
		{
			var max_videos = 25;
			var url = ""
			if (type == "QUERY")
			{
				url = "https://www.googleapis.com/youtube/v3/search?order=viewcount&part=snippet&q=" + escape(query) + "&type=video+&videoDefinition=high&key=" + GOOGLE_API_KEY + "&maxResults="+ max_videos;
			}
			else if (type=="ID")
			{
				url = "https://content.googleapis.com/youtube/v3/videos?part=snippet&key=" + GOOGLE_API_KEY + "&id=" + escape(query);
			}

			console.log("Executing Google API " + url);

			$.getJSON(url, function(json)
			{
				$("#result_content").html("");

				if (json.items.length == 0)
				{
					$("#result_content").html("No Result Found. Please try again");
					return;
				}

				$(json.items).each(function(key, item)
				{
					var videoId		= (item.id.videoId != null) ? item.id.videoId : item.id;
					var songname	= item.snippet.title.substring(0,100);
					var thumbnail	= item.snippet.thumbnails.medium.url;
					var filename	= item.snippet.title.replace( /[<>:\"\/\\|?*]+/g, "" ).replace(/\s+/g, "_").substring(0,100);
					var url			= "https://www.youtube.com/embed/" + videoId;

					var data = {};
						data.videoId     = videoId;
						data.filename    = filename;
						data.url         = url;

					var jsonObj = 
						{
							id			 : videoId,
							songname	 : songname,
							thumbnail    : thumbnail,
							data		 : escapeHtml(JSON.stringify(data))
						};

					console.log("Result : ", jsonObj, data);

					var template = $('#videoTpl').html();
					var html = Mustache.to_html(template, jsonObj);
					$('#result_content').append(html);

				});

				$(".view_youtube").on("click",function()
				{
					var name = $(this).data('name');
					if (name == null) return;
					var data = JSON.parse(decodeEntities(name));
					var url = data.url;
					$.featherlight({iframe: url, iframeWidth: 375 ,	iframeHeight: 315 });

				});
			
				$(".watch").on("click",function()
				{
					var name = $(this).data('name');
					if (name == null) return;

					// Empty Search Box
					$("#searchBox").val("");

					var data = JSON.parse(decodeEntities(name));
					var json = 
						{
							action		: "downloadNewSong", 
							videoId   	:  data.videoId,
							filename	:  data.filename
						}
					console.log("Emitting : ", json);
					socket.emit('songcontrol', json);
					$(this).notify("Download have been started ! ", "success");
					return ;
				});
			});
		}
	}

	$("#searchBox").change(function() 
	{
		searchYouTube();
	});

	function searchYouTube()
	{
		var value = $("#searchBox").val();
		if (value == "")
		{
			$("#result_content").html("");
			return;
		}

		var videoId = getYoutubeId(value);
		if (videoId == value )
		{
			Youtube.getVideo(value, socket, "QUERY");
		}
		else
		{
			Youtube.getVideo(videoId, socket, "ID");
		}
	}

	socket.on("Status", function(data)
	{
		console.log("=============================================");
		console.log("Incoming System Status");
		console.log(data);
		console.log("=============================================");

		GOOGLE_API_KEY = data.youtubeAPIKey;

		var panelStatus = data.panelStatus
		// Format Song Panel
		showSongPanel(panelStatus.running);
		
		// Show Channel Name
		var channelName = data.channelName;
		$("#channelName").html("Channel : " + channelName);
		$("#channelName").attr("ChannelName", channelName);

		// Show Temperature
		var temperature = data.temperature;
		$("#temperature").html("System : " + temperature + " C");

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
	$(".create").on("click",function(){
		setTimeout("openCreateChannelDialog()", 500);
	});

	$(".delete").on("click",function(){
		deleteChannel();
	});
});
