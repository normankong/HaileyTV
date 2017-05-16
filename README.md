# My Hailey Super

This is a mini app run on nodejs / omxplayer to play pre-downloaded Youtube video. Inspired by the Android TV Project (http://blog.donaldderek.com/).

# Feature Supports :
- Download Youtube Video as local repository
- Support Multiple Channel 
- Parent Control to auto stop the play box after predefined on time
- Built in Web App Remote Control 
  - List all the Video
  - Basic Remote Control Functions
    - Stop Play Box
    - Start Play Box 
    - Play Next Song
    - Play Previous Song
    - Fast Forward 
    - Fast Backward
  - Switch Channel
  - Stop Application
  - Start Application
- Admin interface :
   - Create Channel
   - Delete Channel
   - Delete Video
   - Reboot Pi Server
   - Shutdown Pi Server
- Download Interface : 
   - Support Search Youtube by 
      - Keyword
      - Youtube URL

# Installation
  1) Install the youtube-dl binary to your RPi
     - sudo apt-get youtube-dl 
  
  2) Execute the npm to download the dependencies.
     - npm install
  
  2) Create a Default Channel Folder under "public/channel/<DEFAULT_FOLDER>"
     - e.g. mkdir public/channel/Hailey
  
  3) Edit the config/config.json 
    - Update the Default Channel to "<DEFAULT_FOLDER>"
  
  4) Apply the Google API Key for You Tube Search (Optional if you do need to download any youtube video)
       
       https://developers.google.com/youtube/v3/getting-started

  5) Run the Node App
     - npm start

## Recommendation
  Recommend to use Process Manager (e.g. PM2) to manage the application.
  
## Known Issue
  If the RPI was idle for several period of time, the HDMI signal cannot be sent to TV. Restart of the RPi is necessary.
  
Enjoy ! 

![img](https://github.com/normankong/MyHaileySuper/blob/master/doc/introduction.png)
