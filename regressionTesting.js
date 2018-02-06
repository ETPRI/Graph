class regressionTesting {
  constructor() {
    this.logField = document.getElementById('log'); // DOM element - log field
    this.recording = false; // whether actions are being recorded
    this.recordText = {}; // Object storing all recorded actions
    this.recordedStep = 1; // Number of the next action to be recorded - increments whenever an action is recorded and resets when recording stops
    this.playing = false; // whether actions are being replayed
    this.playbackObj = {}; // Object storing all actions to replay
    this.instruction = 2; // Number of the next action to be replayed by next() - starts at 2 because 1 is processed by play(). Increments when an action is played, resets when Play button is clicked
    this.linkDiv = document.getElementById("dlink");
    this.recordings = 1;
    this.playFiles = 0;
    this.db = new db();
  }

  log(message){
  	if (!this.logField.hidden) {
      let line = document.createElement('p');
      let text = document.createTextNode(message);
      line.appendChild(text);
  		this.logField.appendChild(line);
  	}
  } // end log method

  // toggle log on off
  logToggle(button){
  	log = document.getElementById('log');
  	log.hidden = !log.hidden;
  	if (!log.hidden) {
  		// clear Log
  		while (log.hasChildNodes()) {
        log.removeChild(log.firstChild);
      }
  		this.log("logging started");
  		button.value = "log stop";
  	} else {
  		button.value = "log start";
  	}
  } // end logToggle method

  // Logs when any text field is changed in a widgetTableNodes object.
  logText(textBox) {
  	let obj = {};
  	obj.id = app.widgetGetId(textBox);
  	obj.idr = textBox.getAttribute("idr");
  	obj.value = textBox.value;
  	obj.action = "blur";
  	this.log(JSON.stringify(obj));
  	this.record(obj);
  } // end logText method

  // Logs when the search criterion for an input field changes
  logSearchChange(selector) { // selector is the dropdown which chooses among "S", "M" or "E" for strings, and "<", ">", "<=", ">=" or "=" for numbers.
    let obj = {};
  	obj.id = app.widgetGetId(selector);
  	obj.idr = selector.getAttribute("idr");
  	obj.value = selector.options[selector.selectedIndex].value;
  	obj.action = "click";
  	this.log(JSON.stringify(obj));
  	this.record(obj);
  } // end logSearchChange method

  record(message) {
  	if (this.recording) {
  		this.recordText[this.recordedStep++] = message;
  	}
  	if (this.playing) {
  		this.next();
  	}
  } // end record method

  // toggle record on and off
  recordToggle(button){
    if (this.recording) { // If the page was recording
  		button.value = "Record";
  		let text = JSON.stringify(this.recordText);
  		if (this.playing) { // If actions were being recorded during playback

        let playbackText = JSON.stringify(this.playbackObj);
  			if (text == playbackText) {
  				alert ("Success!");
  			}
  			else {
  				alert ("Failure! Original recording: " + playbackText + "; replay recording: " + text);
  			}
  		}
  		else { // If actions were being recorded in order to save them
        let para = document.createElement('p');
  			let uriContent = "data:application/octet-stream," + encodeURIComponent(text);
        let link = document.createElement('a');
        link.href = uriContent;
        let now = new Date();
        let numberDate = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}_${now.getHours()}-${now.getMinutes()}`
        link.download = `Recording_${numberDate}.txt`;
        let message = `Download recording #${this.recordings++}  `;
        let linkText = document.createTextNode(message);
        link.appendChild(linkText);
        para.appendChild(link);
        this.linkDiv.appendChild(para);
  		}
  		// reset
  		this.recordText = {};
  		this.recordedStep = 1;
  	}
    else { // If the page was not recording
  		button.value = "Stop Recording"
  	}
  	this.recording = !this.recording;
  } // end recordToggle method

  // This could be more robust - if you choose the wrong file or the file is corrupted, it might exist and even contain JSON, but not be usable.
  // I'll have to spend some time thinking about the best way of error-checking. But for now, as long as we DON'T choose the wrong file, it should be OK.

  play() { // Reads a file, sets playback variables and plays back the FIRST recorded action
  	let fileButton = document.getElementById("playback");
  	var replayText;

  	if ('files' in fileButton && fileButton.files.length > this.playFiles) { // If there's another file to play back
    alert("Now Playing: " + fileButton.files[this.playFiles].name);
  		this.playing = true;
  		this.instruction = 2;
  		this.playbackObj = {}; // Reset playback variables
  		if (!this.recording) {
  			this.recordToggle(document.getElementById("Record")); // make sure app is recording
  		}

  		let myFile = fileButton.files[this.playFiles];
   		let fileReader = new FileReader();
  		fileReader.onload = function(fileLoadedEvent){ // ANONYMOUS INNER FUNCTION STARTS HERE! Cannot use 'this' to refer to regressionTesting object here!
  			replayText = fileLoadedEvent.target.result;

  			app.regression.playbackObj = JSON.parse(replayText);

  			app.regression.processPlayback(app.regression.playbackObj["1"]); // process the first instruction
  		} // end anonymous function
  		fileReader.readAsText(myFile, "UTF-8");
      this.playFiles++; // go on to the next file
  	} // end if (file exists)

    else {
      this.playFiles = 0; // Reset playFiles
    }

  	if (fileButton.files.length == 0) { // If there were no files uploaded
  		alert ("Select a file first!")
  	}
  } // end play method

  next() { // Replays the next recorded action from a file, if it exists. If not, checks for another file. If all files done, wraps up recording.
  	let instString = this.instruction.toString();
  	this.instruction++; // Prepare to go on to the next instruction
  	if (instString in this.playbackObj) { // If there is an instruction with this number
      this.processPlayback(this.playbackObj[instString]);
  	}
  	else { // Playback is finished. Check for success, then check for another file
      this.recordToggle(document.getElementById("Record"));
      let fileButton = document.getElementById("playback");
      if (fileButton.files.length > this.playFiles) { // If there's another file to play back
        this.play(); // play it
      }
      else { // if we're done playing back all files
    		this.playing = false;
      }
  	}
  } // end next method

  processPlayback(instructionObj) { // takes a single instruction object as argument, plays it
  	let id = instructionObj.id;

  	let element = document.getElementById(id);
  	if ('idr' in instructionObj) {
  		element = app.getChildByIdr(element, instructionObj.idr);
  	}

  	if ('value' in instructionObj) {
  		element.value = instructionObj.value;
  	}

    let evnt = new Event(instructionObj.action);
    if (instructionObj.action == "keydown" && 'key' in instructionObj) { // keydown events have a "key" value that determines WHICH key was pressed
      evnt.key = instructionObj.key;
    }
    element.dispatchEvent(evnt);
  } // end processPlayback method

  clearAll() {
  	if (confirm("This will clear ALL DATA from the database and remove ALL WIDGETS from the webpage. Are you sure you want to do this?")) {
  		for (var id in app.widgets) {
  			// Remove widget objects
  			delete app.widgets[id];

  			// delete  html2 from page
  			const widget = document.getElementById(id);
  			widget.parentElement.removeChild(widget);
  		}
  		// Remove nodes and relationships
  		let command = "MATCH (n) DETACH DELETE n";
  		this.db.setQuery(command);
  		this.db.runQuery(this, "dummy");

  		// reset all variables to ensure same state every time "Clear All" is chosen
  		app.idCounter = 0; // reset ID counter
  		if (this.recording) {
  			this.recordToggle(document.getElementById("Record")); // make sure app is not recording
  		}
//  		log = document.getElementById('log');
  		if (!this.logField.hidden) { // If the log is active...
  			this.logToggle(document.getElementById("LogButton")); // deactivate it
  		}
  	} // end if (user confirms they want to clear all)
  } // end clearAll method

  dummy() {} // Empty method, only here because runQuery has to have SOMETHING for its method argument
} // end class
