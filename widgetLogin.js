class widgetLogin {
  constructor() {
    this.db = new db();
    this.userID = null;
    this.userName = null;
    this.loginDiv = document.getElementById("loginDiv");
    if (!(this.loginDiv == null)) {
      this.buildLoginWidget();
    }
    this.viewLoggedIn = []; // Arrays of DOM elements that should be visible only when logged in or logged out
    this.viewLoggedOut = [];
    this.doOnLogin = [];    // Arrays of objects, each containing object, objectMethod, and parameters, to run when logging in or out
    this.doOnLogout = [];   // Some of these may refer to objects that no longer exist. Check for that and remove if necessary.
  }

  buildLoginWidget() {
    this.loginDiv.setAttribute("class", "widget");

    this.info = document.createElement("p");
    this.info.setAttribute("idr", "userInfo");
    const text = document.createTextNode("Not Logged In");
    this.info.appendChild(text);
    this.loginDiv.appendChild(this.info);

    this.nameInput = document.createElement("input");
    this.nameInput.setAttribute("idr", "userName");
    this.nameInput.setAttribute("onblur", "app.regression.logText(this)");
    this.loginDiv.appendChild(this.nameInput);

    this.loginButton = document.createElement("input");
    this.loginButton.setAttribute("idr", "loginButton");
    this.loginButton.setAttribute("type", "button");
    this.loginButton.setAttribute("value", "Log In");
    this.loginButton.setAttribute("onclick", "app.widget('login', this)");
    this.loginDiv.appendChild(this.loginButton);
  }

  login() {
  	const name = this.nameInput.value;
  	this.db.setQuery(`match (n) where n.name="${name}" return n`);
  	this.db.runQuery(this, 'loginComplete');
  }

  loginComplete(data) {
  	if (data.length == 0) {
  		alert ("No such node found");
  	}

  	else if (data.length == 1) { // Can actually log in
      this.userID = data[0].n.identity; // Log the user in
  		const name = data[0].n.properties.name;
      this.userName = name;
  		this.info.textContent = `Logged in as ${name}`;

      for (let i in this.viewLoggedIn) { // Show all items that are visible when logged in
        this.viewLoggedIn[i].removeAttribute("hidden");
      }

      for (let i in this.viewLoggedOut) { // Hide all items that are visible when logged out
        this.viewLoggedOut[i].setAttribute("hidden", "true");
      }

      for (let i in this.doOnLogin) { // Run all methods that run when a user logs in
        const object = this.doOnLogin[i].object;
        const method = this.doOnLogin[i].method;
        const args = this.doOnLogin[i].args;
        if (object) { // Assuming the object that was provided still exists
          object[method](...args);
        }
      }

      const dropDown = document.getElementById("metaData"); // Add "myTrash" to metadata options
      let option = document.createElement('option');

      option.setAttribute("idr", "myTrash");
      option.setAttribute("value", "myTrash");
      option.appendChild(document.createTextNode("My Trashed Nodes"));
      dropDown.appendChild(option);

      const loginInp = app.domFunctions.getChildByIdr(this.loginDiv, "userName"); // Update login div to let user log out instead of in
      loginInp.setAttribute("hidden", "true");
      const loginButton = app.domFunctions.getChildByIdr(this.loginDiv, "loginButton");
      loginButton.setAttribute("value", "Log Out");
      loginButton.setAttribute("onclick", "app.widget('logout', this)");
  	} // end elseif (can log in)

  	else {
  		alert ("Multiple such nodes found");
  	}

    // log
    const obj = {};
    obj.id = "loginDiv";
    obj.idr = "loginButton";
    obj.action = "click";
    obj.data = JSON.parse(JSON.stringify(data));
    app.stripIDs(obj.data);
    app.regression.log(JSON.stringify(obj));
    app.regression.record(obj);
  }

  logout(button) {
    for (let i in this.viewLoggedOut) { // Show all items that are visible when logged out
      this.viewLoggedOut[i].removeAttribute("hidden");
    }

    for (let i in this.viewLoggedIn) { // Hide all items that are visible when logged in
      this.viewLoggedIn[i].setAttribute("hidden", "true");
    }

    for (let i in this.doOnLogout) { // Run all methods that run when a user logs out
      const object = this.doOnLogout[i].object;
      const method = this.doOnLogout[i].method;
      const args = this.doOnLogout[i].args;
      object[method](...args);
    }

    const dropDown = document.getElementById("metaData"); // Remove the last option, which should be "myTrash", from metadata options
     dropDown.remove(dropDown.length-1);

     const loginInp = app.domFunctions.getChildByIdr(this.loginDiv, "userName"); // Update login div to let user log in instead of out
     loginInp.removeAttribute("hidden");
     const loginButton = app.domFunctions.getChildByIdr(this.loginDiv, "loginButton");
     loginButton.setAttribute("value", "Log In");
     loginButton.setAttribute("onclick", "app.widget('login', this)");

     this.userID = null; // Log the user out
     this.userName = null;
     this.info.textContent = `Not Logged In`;

     // Log
     const obj = {};
     obj.id = "loginDiv";
     obj.idr = "loginButton";
     obj.action = "click";
     app.regression.log(JSON.stringify(obj));
     app.regression.record(obj);
  }
}
