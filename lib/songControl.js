var fs		    = require("fs");
var omx		    = require('node-omxplayer');
var path	    = require('path');
var comControl  = require('./comControl.js');
var moment      = require('moment');

var config      = require("../config/config.json");

var VIDEO_BASE_DIR        = config.VIDEO_BASE_DIR;
var DEFAULT_CHANNEL       = config.DEFAULT_CHANNEL;
var MAXIMUM_PLAY_TIME     = config.MAXIMUM_PLAY_TIME;
var IS_AUTO_PLAY          = config.IS_AUTO_PLAY;

var player			      = omx();

var songControlContext = new Object();
	songControlContext["BASE_CHANNEL"]			= null;
	songControlContext["BASE_DIR"]				= null;
	songControlContext["CURRENT_SONG"]			= -1;
	songControlContext["CURRENT_CHANNEL"]		= null;
	songControlContext["NEXT_SONG"]				= null;
	songControlContext["AIR_TIME"]				= null;
	songControlContext["MAXIMUM_PLAY_TIME"]		= null;

function init()
{
	setBaseDir(VIDEO_BASE_DIR);
	setBaseChannel(DEFAULT_CHANNEL);
	setCurrentChannel(DEFAULT_CHANNEL)
	setMaxPlayTime(MAXIMUM_PLAY_TIME);
	if (IS_AUTO_PLAY) playSong(null);
}

function getChannelList()
{
	var resultList = [];
	var files = fs.readdirSync(getBaseDir());
	for (var i in files)
	{		
		var name = files[i];
		if (fs.statSync(getBaseDir() + "/" + name).isDirectory())
		{
			resultList.push(name);
		}
	}
	return resultList;
}

function getSongList()
{
	var songDirectory = getSongDirectory();
	if (!fs.statSync(songDirectory).isDirectory())
	{
		console.log("Directory is invalid : " + songDirectory);
		return;
	}

	var resultList	  = [];
	var files = fs.readdirSync(songDirectory);
	for (var i in files)
	{		
		var file = files[i];
		if (!fs.statSync(songDirectory + "/" + file).isFile())
		{
			continue;
		}

		var ext = path.extname(file).substr(1);
		if(file.substr(0, 1) != "." && ['mp4','avi','mkv','flv','webm','vob','ogv','ogg','mov','qt','wmv','m4v','mpg','mpeg','m4v','m2v','3gp'].indexOf(ext) != -1)
		{
			resultList.push(file);
		}
	}
	return resultList;
}

function getSongControlStatus()
{
	var songDirectory  = getSongDirectory();
	var songList	   = getSongList();
	var songIndex      = getCurrentSong();
	var currentChannel = getCurrentChannel();
	var songJSON = []; 
	console.log ("Song Number : " + songIndex);
	for (var i=0;i < songList.length;i++)
	{ 
		var isPlaying = false;
		if (songIndex == i)
		{
			isPlaying = true;
		}

		var filename = songList[i];
		var songname = filename.replace(/\.[^/.]+$/, "").replace(/_/gmi, " ");
		var thumnail = "/channel/" + currentChannel + "/" + filename.replace(/\.[^/.]+$/, "") + ".jpg";
		
		// Generate the JSON spec
		var json = {filename: filename, songname: songname, thumnail: thumnail, isPlaying: isPlaying}
		songJSON.push(json);
	}

	var channelList = getChannelList();
	var channelJSON = [];
	for (var i=0;i < channelList.length;i++)
	{ 
		var isPlaying = false;
		if (currentChannel == channelList[i])
		{
			isPlaying = true;
		}

		channelJSON.push({channelName: channelList[i], isPlaying : isPlaying});
	}

	var response = {};
		response.channelName	= currentChannel;
		response.songList		= songJSON;
		response.channelList	= channelJSON;
		response.panelStatus    = {running : (getCurrentSong() != -1), airTime : getAirTime()};
		response.youtubeAPIKey  = config.YOUTUBE_API_KEY;
	
	return response;
}


function findSong(songList, filename)
{
	// Remove extension
	var filename = filename.replace(/\.[^/.]+$/, "");
	for (var i=0; i < songList.length; i++)
	{ 
		// Remove extension
		var songname = songList[i].replace(/\.[^/.]+$/, "");
		if (songname == filename)
		{
			return i;
		}
	}

	console.error("Unable to match any song by filename", filename, songList);
	return -1;
}

function playSong(songNumber)
{
	var songDirectory = getSongDirectory();
	var songList	  = getSongList();

	var currentSong = getCurrentSong();
	if (currentSong == -1)
	{
		console.log("Start Tick Time");
		tickTime();
	}

	var airTime = getAirTime();
	if (airTime - new Date() > getMaxPlayTime())
	{
		stopPlayBox();
		
		// Broadcast System Status
		var json = {type:"ack", eventType: "warn", source:data.action, message : "Maximum Play Time reach. Hailey TV have been stopped !"};
		comControl.broadcast("Notification", json);
	}
	else if (songList.length == 0) 
	{
		var json = {type:"notification", eventType: "warn", source: "playSong", message : "Channel " + getCurrentChannel() + " do not have any songs"};
		comControl.broadcast("Notification", json);
		stopPlayBox();
	}
	else
	{
		if (songNumber == null) // Randomize the song if not defined
		{
			var min = 0;
			var max = songList.length - 1;
			songNumber = Math.floor(Math.random() * (max - min + 1)) + min; //Returns a random integer between min (inclusive) and max (inclusive)
		}

		// If it is the Last Songs
		if (songList.length <= songNumber)
		{
			console.log("Song Number is " + songNumber + " is out of range. Reset to Zero.");
			songNumber = 0;
		}
		if (songNumber < 0)
		{
			console.log("Song Number is " + songNumber + " is out of range. Reset to Max Number." + (songList.length - 1));
			songNumber = songList.length - 1;
		}

		// Set the Current Song
		setCurrentSong(songNumber);
		setNextSong(songNumber + 1);
		
		var filename = songDirectory + "/" + songList[songNumber];
		console.log("===========================================================================");
		console.log("Now Playing : " + (songNumber+1) + "/" + songList.length + " [" + filename +"]");
		console.log("===========================================================================");

		// Play Song
		player.newSource(filename, "hdmi");
	}

	// Broadcast System Status
	var systemStatus = getSongControlStatus();
	comControl.broadcast("SystemStatus", systemStatus);
};


player.on('close', function()
{
	console.log("---------------------------------");
	console.log("Finish playing previous songs    ");
	console.log("---------------------------------");

	var nextSong = getNextSong();
	if (nextSong != -1)
	{
		console.log("Play Next : " + nextSong) ;
		playSong(nextSong);
	}
	else
	{
		console.log("Application stopped");
	}
});

player.on('error', function(message)
{
	console.log("Error : ", message);
	console.log("---------------------------------");
	console.log("Error playing previous songs    ");
	console.log("---------------------------------");

	var nextSong = getNextSong();
	console.log("Play Next : " + nextSong) ;
	playSong(nextSong);
});

	
function playDedicatedSong(data, socket)
{
	if (!player.running)
	{
		var json = {type:"ack", eventType: "warn", source:data.action, message : "Hailey TV have been stopped !"};
		comControl.notify("Notification", json, socket);
		return;
	}

	var filename   = data.filename;
	var songList   = getSongList();
	var songNumber = findSong(songList, filename);
	if (songNumber == -1 )
	{
		return;
	}

	// Check whether it is currently playing (Prevent double tap)
	var currentSong = getCurrentSong();
	if (currentSong == songNumber) 
	{
		var json = {type:"ack", eventType: "warn", source:data.action, message : "Already playing !"};
		comControl.notify("Notification", json, socket);
		return;
	}

	// Start Dedicate Video by pass the new Song Number
	console.log("Starting Dedicate Video : " + filename + " --> " + songNumber);
	playDelaySong(songNumber);

	var json = {type:"notification", eventType: "info", source:data.action, message : "New Song will be played !"};
	comControl.broadcast("Notification", json);

	return;
}

function downloadNewSong(data, socket)
{
	var videoId		= data.videoId;
	var filename	= data.filename;

	var songDirectory  = getSongDirectory();
	var currentChannel = getCurrentChannel();
	console.log("Download New Song " );
	console.log("Song Directory  : " + songDirectory);
	console.log("Video ID        : " + videoId		);
	console.log("Filename        : " + filename		);

//	http://www.youtube.com/watch?v=" + videoId;

//	youtube-dl --write-thumbnail -o happy_birthday_1.mp4 -f /18/22 https://www.youtube.com/watch?v=qCJSNMqub8g
//  youtube-dl --write-thumbnail -o happy_birthday_2.mp4 -f /18/22 https://www.youtube.com/watch?v=lO2mYAaOzwo
//  youtube-dl --write-thumbnail -o happy_birthday_3.mp4 -f /18/22 https://www.youtube.com/watch?v=m-0G9P6PLH0
//  youtube-dl --write-thumbnail -o happy_birthday_4.mp4 -f /18/22 https://www.youtube.com/watch?v=z9v2d7RW5Ts

	var url = "http://www.youtube.com/watch?v=" + videoId;
	var runShell = new run_shell('youtube-dl',['--write-thumbnail', '-o', songDirectory + "/" + filename + ".%(ext)s",'-f','/18/22',url],
	function (me, buffer) 
	{
		if (config.IS_DEBUG)
		{
			me.stdout += buffer.toString();
			console.log(me.stdout);
		}
	 },
	function ()
	{
		var filename   = data.filename;
		var songList   = getSongList();
		var songNumber = findSong(songList, filename);
		if (songNumber == -1 )
		{
			var json = {type:"ack", eventType: "warn", source:data.action, message : "Unable to download the song. Please try another"};
			comControl.notify("Notification", json, socket);
		}
		else
		{
			if (!player.running)
			{
				var json = {type:"ack", eventType: "warn", source:data.action, message : "Song have been download. But Hailey TV was not started !"};
				comControl.notify("Notification", json, socket);
				return;
			}
			
			var json = {type:"ack", eventType: "success", source:data.action, message : "Song have bee download. Play Now !"};
			comControl.notify("Notification", json, socket);
			playDedicatedSong(data, socket);
		}
	});
}

function createChannel(data, socket)
{
	var folder = data.channelName;
	var dir = getBaseDir() + "/" + folder;

	var json = null;
	if (!fs.existsSync(dir))
	{
		fs.mkdirSync(dir)
		if (fs.existsSync(dir))
		{
			json = {type:"ack", eventType: "success", source:data.action, message : "Channel " + folder + " creation success."};
		}
		else
		{
			json = {type:"ack", eventType: "error", source:data.action, message : "Channel " + folder + " creation fails."};
		}
	}
	else
	{
		json = {type:"ack", eventType: "error", source:data.action, message : "Channel " + folder + " already existed."};
	}

	comControl.notify("Notification", json, socket);
}

function deleteChannel(data, socket)
{
	var folder = data.channelName;
	var dir = getBaseDir() + "/" + folder;

	var json = null;
	if (!fs.existsSync(dir))
	{
		json = {type:"ack", eventType: "error", source:data.action, message : "Channel " + folder + " do not existed."};
	}
	else if (getSongList().length != 0)
	{
		json = {type:"ack", eventType: "error", source:data.action, message : "Channel " + folder + " is not empty."};
	}
	else 
	{
		// Set to Base Channel 
		setCurrentChannel(getBaseChannel());

		// Remove Folder
		fs.rmdirSync(dir)

		// Check Removal Status
		if (fs.existsSync(dir))
		{
			json = {type:"ack", eventType: "error", source:data.action, message : "Channel " + folder + " deletion fails."};
		}
		else
		{
			json = {type:"ack", eventType: "success", source:data.action, message : "Channel " + folder + " deletion success."};
		}
	}

	comControl.notify("Notification", json, socket);
}


function deleteSong(data, socket)
{
	var songfile      = getSongDirectory() + "/" + data.filename;
	var thumbnail     = getSongDirectory() + "/" + data.filename.replace(/\.[^/.]+$/, "") + ".jpg";;

	var json = null;
	if (!fs.existsSync(songfile) || !fs.existsSync(thumbnail))
	{
		json = {type:"ack", eventType: "error", source:data.action, message : "Song does not existed."};
	}
	else 
	{
		// Remove Folder
		fs.unlinkSync(songfile);
		fs.unlinkSync(thumbnail);

		// Check Removal Status
		if (fs.existsSync(songfile) || fs.existsSync(thumbnail))
		{
			json = {type:"ack", eventType: "error", source:data.action, message : "Song deletion fails."};
		}
		else
		{
			json = {type:"ack", eventType: "success", source:data.action, message : "Song deletion success."};
		}
	}

	comControl.notify("Notification", json, socket);
}

function switchChannel(data, socket)
{
	var channelName = data.channelName;
	var autoPlay    = data.autoPlay;

	setCurrentChannel(channelName);
	
	if (!player.running)
	{
		var json = {type:"ack", eventType: "warn", source:data.action, message : "Switch Channel during Hailey TV have been stopped !"};
		comControl.broadcast("Notification", json);

		stopPlayBox();
		autoPlay = false;
	}

	// Start Play the New Channel
	if (autoPlay)
	{
		playDelaySong(null);
	}
	else
	{
		setNextSong(null);
	}
}

function startApplication(data, socket)
{
	if (player.running)
	{
		var json = {type:"ack", eventType: "warn", source:data.action, message : "Hailey TV have been started!"};
		comControl.notify("Notification", json, socket);
		return;
	}

	var json = {type:"notification", eventType: "success", source:data.action, message : "Hailey TV have started!"};
	comControl.broadcast("Notification", json);

	playSong(null);
}

function stopApplication(data, socket)
{
	console.log("Stop Application");
	
	if (!player.running)
	{
		var json = {type:"ack", eventType: "warn", source:data.action, message : "Hailey TV have been stopped !"};
		comControl.notify("Notification", json, socket);
		return;
	}

	setNextSong(-1);

	// Trigger the decouple omx quit process
	player.quit();

	// Stop the Play Box
	stopPlayBox()

	var json = {type:"notification", eventType: "success", source:data.action, message : "Hailey TV have stopped !"};
	comControl.broadcast("Notification", json);
}

function pausePlaySong(data, socket)
{
	if (!player.running)
	{
		var json = {type:"ack", eventType: "warn", source:data.action, message : "Hailey TV have been stopped !"};
		comControl.notify("Notification", json, socket);
		return;
	}

	player.pause();	
}

function resumePlaySong(data, socket)
{
//	(player.running) ? player.play() : playSong(null);
	if (!player.running)
	{
		var json = {type:"ack", eventType: "warn", source:data.action, message : "Hailey TV have been stopped !"};
		comControl.notify("Notification", json, socket);
		return;
	}

	player.play();
}

function playPreviousSong(data, socket)
{
	if (!player.running)
	{
		var json = {type:"ack", eventType: "warn", source:data.action, message : "Hailey TV have been stopped !"};
		comControl.notify("Notification", json, socket);
		return;
	}

	console.log("Play Previous Song");
	var songNumber     = getCurrentSong();	
	playDelaySong(songNumber - 1);
}

function playNextSong(data, socket)
{
	if (!player.running)
	{
		var json = {type:"ack", eventType: "warn", source:data.action, message : "Hailey TV have been stopped !"};
		comControl.notify("Notification", json, socket);
		return;
	}

	console.log("Play Next Song");
	var songNumber     = getCurrentSong();	
	playDelaySong(songNumber + 1);
}

function playDelaySong(songNumber)
{
	// Over the Next Song such that After OMX Quit, the play song will choose the one we need
	console.log("Update the next song to : " + songNumber);
	setNextSong(songNumber);

	// Trigger the decouple omx quit process
	player.quit();

	// Special Cheat to return to the Remote Controller as playSong is separate thread.
	setCurrentSong(songNumber);
}

function backwardSong(data, socket)
{
	if (!player.running)
	{
		var json = {type:"ack", eventType: "warn", source:data.action, message : "Hailey TV have been stopped !"};
		comControl.notify("Notification", json, socket);
		return;
	}
	player.back600();
}

function forwardSong(data, socket)
{
	if (!player.running)
	{
		var json = {type:"ack", eventType: "warn", source:data.action, message : "Hailey TV have been stopped !"};
		comControl.notify("Notification", json, socket);
		return;
	}
	player.fwd600();
}

function stopPlayBox()
{
	setCurrentSong(-1);
	stopTime();
}

function run_shell(cmd, args, dataCB , endCB) 
{
	console.log(cmd, args);

	var spawn = require('child_process').spawn,
		child = spawn(cmd, args),
		me	  = this;
	child.stdout.on('data', function (buffer) { dataCB(me, buffer); });
	child.stdout.on('end', endCB);
}


function getSongDirectory()			{	return getBaseDir() + "/" + getCurrentChannel();}

function setBaseChannel(value)		{		   songControlContext["BASE_CHANNEL"] = value	;}
function getBaseChannel()			{	return songControlContext["BASE_CHANNEL"]			;}

function setCurrentChannel(value)	{		   songControlContext["CURRENT_CHANNEL"] = value	;}
function getCurrentChannel()		{	return songControlContext["CURRENT_CHANNEL"]			;}

function setBaseDir(value)          {		   songControlContext["BASE_DIR"] = value			;}
function getBaseDir()               {   return songControlContext["BASE_DIR"]					;}

function setCurrentSong(value)		{		   songControlContext["CURRENT_SONG"] = value       ;}
function getCurrentSong()			{	return songControlContext["CURRENT_SONG"]				;}

function setNextSong(value)			{		   songControlContext["NEXT_SONG"] = value			;}
function getNextSong()				{	return songControlContext["NEXT_SONG"]					;}

function setMaxPlayTime(value)		{		   songControlContext["MAXIMUM_PLAY_TIME"] = value	;}
function getMaxPlayTime()			{	return songControlContext["MAXIMUM_PLAY_TIME"]			;}

function tickTime()					{		   songControlContext["AIR_TIME"] = new Date()		;}
function stopTime()					{	return songControlContext["AIR_TIME"] = null			;}

function getAirTime()				
{	
	var airTime = songControlContext["AIR_TIME"]
	if (airTime != null)
	{
		return new Date() - airTime;
	}
	return 0;
}


function proceed(data, socket)
{
	switch (data.action)
	{
		case "watch":
			playDedicatedSong(data, socket);
			return true;
			break;
		case "downloadNewSong":
			downloadNewSong(data, socket);
			return false;
			break;
		case "switchChannel":
			switchChannel(data, socket);
			return true;
			break;
		case "createChannel":
			createChannel(data, socket);
			return true;
			break;
		case "deleteChannel":
			deleteChannel(data, socket);
			return true;
			break;
		case "deleteSong":
			deleteSong(data, socket);
			return true;
			break;
		case "start":
			startApplication(data, socket);
			return true;
			break;
		case "stop":
			stopApplication(data, socket);
			return true;
			break;
		case "previous":
			playPreviousSong(data, socket);
			return true;
			break;
		case "next":
			playNextSong(data, socket);
			return true;
			break;
		case "pause":
			pausePlaySong(data, socket);
			return true;
			break;
		case "play":
			resumePlaySong(data, socket);
			return true;
			break;
		case "backward":
			backwardSong(data, socket);
			break;
		case "forward":
			forwardSong(data, socket);
			break;
		default:
			return false;
			break;
	}
	return false;
}

exports.init						= init;
exports.proceed						= proceed;
exports.getSongControlStatus		= getSongControlStatus;
