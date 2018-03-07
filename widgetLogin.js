class widgetLogin {
  constructor() {
    this.db = new db();

    // DOM elements to be filled in later
    this.info = null;
    this.nameInput = null;
    this.passwordInput = null;
    this.loginButton = null;

    // data to fill in when the user logs in
    this.userID = null;
    this.userName = null;
    this.permissions = null;

    this.viewLoggedIn = []; // Arrays of DOM elements that should be visible only when logged in or logged out
    this.viewLoggedOut = [];
    this.viewAdmin = [];

    // Example: {object:widgetView, method:"onLogin", args:[]}
    this.doOnLogin = [];    // Arrays of objects, each containing object, objectMethod, and parameters, to run when logging in or out
    this.doOnLogout = [];   

    this.loginDiv = document.getElementById("loginDiv");
    if (!(this.loginDiv == null)) {
      this.buildLoginWidget();
    }
  }

  buildLoginWidget() {
    this.loginDiv.setAttribute("class", "widget");

    this.info = document.createElement("p");
    this.info.setAttribute("idr", "userInfo");
    const text = document.createTextNode("Not Logged In");
    this.info.appendChild(text);
    this.loginDiv.appendChild(this.info);

    const loginInfo = document.createElement('p'); // element to hold the prompts and textboxes for logging in
    this.viewLoggedOut.push(loginInfo);
    this.loginDiv.appendChild(loginInfo);

    const namePrompt = document.createTextNode("Username:");
    loginInfo.appendChild(namePrompt);

    this.nameInput = document.createElement("input");
    this.nameInput.setAttribute("idr", "userName");
    this.nameInput.setAttribute("onblur", "app.regression.logText(this)");
    loginInfo.appendChild(this.nameInput);

    const passwordPrompt = document.createTextNode("Password: ");
    loginInfo.appendChild(passwordPrompt);

    this.passwordInput = document.createElement("input");
    this.passwordInput.setAttribute("idr", "password");
    this.passwordInput.setAttribute("onblur", "app.regression.logText(this)");
    loginInfo.appendChild(this.passwordInput);

    this.loginButton = document.createElement("input");
    this.loginButton.setAttribute("idr", "loginButton");
    this.loginButton.setAttribute("type", "button");
    this.loginButton.setAttribute("value", "Log In");
    this.loginButton.setAttribute("onclick", "app.widget('login', this)");
    this.loginDiv.appendChild(this.loginButton);
  }

  checkAdminTable() { // Ensure that the Admin and User nodes exist, and search for users who are admins
    this.db.setQuery(`merge (:LoginTable {name: "User"}) merge (admin:LoginTable {name: "Admin"}) with admin match (user:people)-[:Permissions]->(admin) return user`);
    this.db.runQuery(this, 'checkAdminUser');
  }

  checkAdminUser(data) {
    if (data.length == 0) { // if no users are admins, create a temporary admin node if it doesn't exist
      this.db.setQuery(`match (admin:LoginTable {name: "Admin"}) merge (tempAdmin:tempAdmin {name: "Temporary Admin Account"})-[temp:Permissions {username:"admin", password:"admin"}]->(admin)`);
      this.db.runQuery();
    }
    else { // if at least one user is an admin, delete the temporary admin node if it exists
      this.db.setQuery(`match (tempAdmin:tempAdmin) detach delete tempAdmin`);
      this.db.runQuery();
    }
  }

  login() {
  	const name = this.nameInput.value;
    const password = this.passwordInput.value;
  	this.db.setQuery(`match (user)-[rel:Permissions {username:"${name}", password:"${password}"}]->(table:LoginTable) return ID(user) as userID, user.name as name, table.name as permissions`);
  	this.db.runQuery(this, 'loginComplete');
  }

  loginComplete(data) {
  	if (data.length == 0) {
  		alert ("No such node found");
  	}

  	else if (data.length == 1) { // Can actually log in
      this.userID = data[0].userID; // Log the user in
      this.userName = data[0].name;
      this.permissions = data[0].permissions;
  		this.info.textContent = `Logged in as ${this.userName} -- Role: ${this.permissions}`;
      this.info.classList.add('loggedIn');

      for (let i in this.viewLoggedIn) { // Show all items that are visible when logged in
        this.viewLoggedIn[i].removeAttribute("hidden");
      }

      for (let i in this.viewLoggedOut) { // Hide all items that are visible when logged out
        this.viewLoggedOut[i].setAttribute("hidden", "true");
      }

      if (this.permissions == "Admin") {
        for (let i in this.viewAdmin) { // Show all items that are visible when logged in as an admin
          this.viewAdmin[i].removeAttribute("hidden");
        }
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

      // Turn login button into logout button
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

    for (let i in this.viewAdmin) { // Hide all items that are visible when logged in as an admin
      this.viewAdmin[i].setAttribute("hidden", "true");
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
     this.info.classList.remove("loggedIn");

     // Log
     const obj = {};
     obj.id = "loginDiv";
     obj.idr = "loginButton";
     obj.action = "click";
     app.regression.log(JSON.stringify(obj));
     app.regression.record(obj);
  }
}
