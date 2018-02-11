class regressionTesting {
  constructor(globalVar) {
    this.logField = document.getElementById('log'); // DOM element - log field
    this.recording = false; // whether actions are being recorded
    this.recordText = {}; // Object storing all recorded actions
    this.recordedStep = 1; // Number of the next action to be recorded - increments whenever an action is recorded and resets when recording stops
    this.playing = false; // whether actions are being replayed continuously
    this.stepThrough = false; // whether actions are being stepped through one at a time
    this.fileRunning = false; // whether a file has already been accessed and is currently being played
    this.playbackObj = {}; // Object storing all actions to replay
    this.instruction = 2; // Number of the next action to be replayed by next() - starts at 2 because 1 is processed by play(). Increments when an action is played, resets when Play button is clicked
    this.linkDiv = document.getElementById("dlink");
    this.recordings = 1;
    this.playFiles = 0;
    this.domFunctions = new domFunctions();
    this.regHeader = document.getElementById("regressionHeader");
    this.globalVar = globalVar; // name of the global variable which contains an instance of regressionTesting

    if (!(this.regHeader == null) && (typeof globalVar !== 'undefined')) {
      this.buildRegressionHeader();
    }

    this.playDOM = document.getElementById("replay");
    this.stepDOM = document.getElementById("stepThrough");
    this.delayMS = document.getElementById("delayMS");
    this.delayOn = document.getElementById("delayOn");
  }

  buildRegressionHeader() {
    let regHeader = document.getElementById("regressionHeader");
    let record = document.createElement("input");
    record.setAttribute("type", "button");
    record.setAttribute("id", "Record");
    record.setAttribute("value", "Record");
    record.setAttribute("onclick", `${this.globalVar}.regression.recordToggle(this)`);
    regHeader.appendChild(record);

    regHeader.appendChild(document.createTextNode("Select a playback file: "));

    let playback = document.createElement("input");
    playback.setAttribute("type", "file");
    playback.setAttribute("id", "playback");
    playback.setAttribute("multiple", "true");
    regHeader.appendChild(playback);

    let replay = document.createElement("input");
    replay.setAttribute("type", "button");
    replay.setAttribute("id", "replay");
    replay.setAttribute("value", "Play Remaining Steps");
    replay.setAttribute("onclick", `${this.globalVar}.regression.play(this)`);
    regHeader.appendChild(replay);

    let step = document.createElement("input");
    step.setAttribute("type", "button");
    step.setAttribute("id", "stepThrough");
    step.setAttribute("value", "Play Next Step");
    step.setAttribute("onclick", `${this.globalVar}.regression.play(this)`);
    regHeader.appendChild(step);

    let delayOn = document.createElement("input");
    delayOn.setAttribute("type", "checkbox");
    delayOn.setAttribute("id", "delayOn");
    delayOn.setAttribute("checked", "true");
    delayOn.setAttribute("onclick", `${this.globalVar}.regression.delayToggle(this)`);
    regHeader.appendChild(delayOn);

    regHeader.appendChild(document.createTextNode("Use delay when replaying"));

    let delayMS = document.createElement("input");
    delayMS.setAttribute("type", "number");
    delayMS.setAttribute("id", "delayMS");
    delayMS.setAttribute("value", 500);
    regHeader.appendChild(delayMS);

    regHeader.appendChild(document.createTextNode("Enter delay (in milliseconds)"));

    let dlink = document.createElement("p");
    dlink.setAttribute("id", "dlink");
    regHeader.appendChild(dlink);
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
  	obj.id = this.domFunctions.widgetGetId(textBox);
  	obj.idr = textBox.getAttribute("idr");
  	obj.value = textBox.value;
  	obj.action = "blur";
  	this.log(JSON.stringify(obj));
  	this.record(obj);
  } // end logText method

  // Logs when the search criterion for an input field changes
  logSearchChange(selector) { // selector is the dropdown which chooses among "S", "M" or "E" for strings, and "<", ">", "<=", ">=" or "=" for numbers.
    let obj = {};
  	obj.id = this.domFunctions.widgetGetId(selector);
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
      if (this.delayOn.checked) {
        setTimeout(this.next, this.delayMS.value, this); // slow down the replay and see if that fixes the widgetNode bug
      }
      else {
        this.next(this);
      }
  	}
  } // end record method

  // toggle record on and off
  recordToggle(button){
    if (this.recording) { // If the page was recording
  		button.value = "Record";
  		let text = JSON.stringify(this.recordText);
  		if (this.playing || this.stepThrough) { // If actions were being recorded during playback

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

  play(button) { // Reads a file, sets playback variables and plays back the FIRST recorded action
    if (this.fileRunning) { // if a file is already running
      if (button == this.stepDOM) { // if play was called by the stepThrough button
        this.stepThrough = true;
        this.playing = false;
        this.next(this);
      }
      else { // if play was called by play button
        this.playing = true;
        this.stepThrough = false;
        this.next(this);
      }
    }
    else { // if a file is NOT already running
    	let fileButton = document.getElementById("playback");
    	var replayText;

    	if ('files' in fileButton && fileButton.files.length > this.playFiles) { // If there's another file to play back
        alert("Now Playing: " + fileButton.files[this.playFiles].name);
        if ((!button && this.stepThrough) || button == this.stepDOM) { // If play was called by the stepThrough button, or called by next when stepping through
      		this.playing = false;
          this.stepThrough = true;
        }
        else if ((!button && this.playing) || button == this.playDOM) { // If play was called by the play button, or called by next when playing
          this.playing = true;
          this.stepThrough = false;
        }
    		this.instruction = 2;
    		this.playbackObj = {}; // Reset playback variables
        let regression = this;

    		if (!this.recording) {
    			this.recordToggle(document.getElementById("Record")); // make sure app is recording
    		}

    		let myFile = fileButton.files[this.playFiles];
     		let fileReader = new FileReader();
    		fileReader.onload = function(fileLoadedEvent){ // ANONYMOUS INNER FUNCTION STARTS HERE! Cannot use 'this' to refer to regressionTesting object here!
    			replayText = fileLoadedEvent.target.result;
    			regression.playbackObj = JSON.parse(replayText);
    			regression.processPlayback(regression.playbackObj["1"]); // process the first instruction
    		} // end anonymous function
    		fileReader.readAsText(myFile, "UTF-8");
        this.fileRunning = true;
        this.playFiles++; // go on to the next file
    	} // end if (file exists)

      else { // There are no more files to play. Reset.
        this.playFiles = 0; // Reset playFiles
        this.playing = false;
        this.stepThrough = false;
      }

    	if (fileButton.files.length == 0) { // If there were no files uploaded
    		alert ("Select a file first!")
    	}
    } // end if (file is not already playing)
  } // end play method

  next(regression) { // Replays the next recorded action from a file, if it exists. If not, checks for another file. If all files done, wraps up recording.
  	let instString = regression.instruction.toString();
  	regression.instruction++; // Prepare to go on to the next instruction
  	if (instString in regression.playbackObj) { // If there is an instruction with this number
      regression.processPlayback(regression.playbackObj[instString]);
  	}
  	else { // Playback is finished. Check for success, then check for another file
      regression.recordToggle(document.getElementById("Record"));
      this.fileRunning = false;
      let fileButton = document.getElementById("playback");
      if (fileButton.files.length > regression.playFiles) { // If there's another file to play back
        regression.play(); // play it
      }
      else { // if we're done playing back all files
    		regression.playing = false;
        regression.playFiles = 0;
      }
  	}
  } // end next method

  processPlayback(instructionObj) { // takes a single instruction object as argument, plays it
    if ('id' in instructionObj) { // Can only replay an action or set a value if this instruction defines an element, using an id and maybe an idr
  	  let id = instructionObj.id;
    	let element = document.getElementById(id);

    	if ('idr' in instructionObj) {
    		element = this.domFunctions.getChildByIdr(element, instructionObj.idr);
    	}

    	if ('value' in instructionObj) {
    		element.value = instructionObj.value;
    	}

      if ('action' in instructionObj) {
        let evnt = new Event(instructionObj.action);
        if (instructionObj.action == "keydown" && 'key' in instructionObj) { // keydown events have a "key" value that determines WHICH key was pressed
          evnt.key = instructionObj.key;
        }
        element.dispatchEvent(evnt);
      } // end if (the instruction contains an action)
    } // end if (the instruction has an id)
  } // end processPlayback method

  clearAll(app) {
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
  		app.db.setQuery(command);
  		app.db.runQuery(this, "dummy");

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

  delayToggle(checkBox) {
    if(checkBox.checked) {
      this.delayMS.disabled=false;
    }
    else {
      this.delayMS.disabled=true;
    }
  }

  dummy() {} // Empty method, only here because runQuery has to have SOMETHING for its method argument
} // end class
