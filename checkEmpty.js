class checkEmpty {
  constructor() {}

  checkEmpty(button) { // Check whether the db is empty.
    app.db.setQuery("match(n) return n");
    app.db.runQuery(this, 'verifyEmpty');
  }

  verifyEmpty(data) {
    if (data.length > 0) { // If any data were returned
      alert ("This test can only be run on an empty database! Please switch to an empty database and try again. This recording will be aborted.");
      app.regression.recordToggle(document.getElementById("Record"));
      app.regression.playing = false;
      app.regression.stepThrough = false;
      app.regression.fileRunning = false;
      app.regression.playbackObj = {};
      app.regression.playFiles = 0;
      app.regression.instruction = 1;
      const fileButton = document.getElementById("playback");
      fileButton.value="";
    }
    // log
    const obj = {};
    obj.id = "checkEmpty";
    obj.action = "click";
    obj.data = data; // No real need to strip the IDs - I was doing that to make recordings and replays match, but if this gets triggered that ship has sailed.
    app.regression.log(JSON.stringify(obj));
    app.regression.record(obj);
  }
}
