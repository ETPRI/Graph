class widgetLogin {
  constructor() {
    this.db = new db();
    this.userID = null;
    this.userName = null;
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
  	this.db.setQuery(`match (n) where (n._trash='' or not exists(n._trash)) and n.name="${name}" return n`);
  	this.db.runQuery(this, 'loginComplete');
  }

  loginComplete(data) {
  	if (data.length == 0) {
  		alert ("No such node found");
  	}
  	else if (data.length == 1) { // Can actually log in
  		this.userID = data[0].n.identity;
  		const name = data[0].n.properties.name;
      this.userName = name;
  		this.info.textContent = `Logged in as ${name}`;

      for (let i in app.loginOnly) {
        app.loginOnly[i].removeAttribute("hidden");
      }

      const dropDown = document.getElementById("metaData");
      let option = document.createElement('option');

      option.setAttribute("idr", "myTrash");
      option.setAttribute("value", "myTrash");
      option.appendChild(document.createTextNode("My Trashed Nodes"));
      dropDown.appendChild(option);

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
}
