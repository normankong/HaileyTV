var host	= document.location.origin;
var socket  = io.connect(host);

socket.on('connect', function(data)
{
	socket.emit('RemoteController',{action:"initialize"});

	socket.on("Status", function(data)
	{
		console.log("=============================================");
		console.log("Incoming System Status");
		console.log(data);
		console.log("=============================================");

		var panelStatus = data.panelStatus
		showSongPanel(panelStatus.running);

		// Show Temperature
		var temperature = data.temperature;
		$("#temperature").html("System : " + temperature + " C");

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

	})
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