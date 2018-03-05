class widgetView {
  constructor(containerDOM, nodeID, relationType, object, objectMethod) {
    this.relations = {}; // Will store IDs as keys and DOM objects as values
    this.activeDOM = null; // Will store the DOM object for the relation currently shown
    this.activeToggle = null; // Will store the toggle button for the relation currently shown

    this.relationType = relationType;
    this.nodeID = nodeID;
    this.containerDOM = containerDOM;
    this.object = object;
    this.objectMethod = objectMethod;

    this.id = app.idCounter++;  // Add to app.widgets
    app.widgets[this.id] = this;

    this.containerDOM.setAttribute("id", this.id.toString());
    this.containerDOM.setAttribute("class", "widget");

    this.containedWidgets = [];
    this.rows = 0;
    this.widgetTable = null;
    this.viewTable = null;
    this.relCell = null;
    this.add = null;

    this.db = new db();
    const query = `match (user)-[:Owner]->(view:View {direction:"${relationType}"})-[:Subject]->(node) where id(node) = ${nodeID} return ID(user) as ID, user.name as name order by name, ID`;
    this.db.setQuery(query);
    this.db.runQuery(this, "buildViews", object, objectMethod);
  }

  buildViews(data, object, objectMethod) {
    // Log data first, so if any relations are created this will show up first
    const obj = {};
    obj.data=JSON.parse(JSON.stringify(data));
    app.stripIDs(obj.data);
    app.regression.log(JSON.stringify(obj));
    app.regression.record(obj);

    // If there was already a widget in the containerDOM (we are refreshing), delete it
    if (this.widgetTable) {
      this.containerDOM.removeChild(this.widgetTable);
    }

    // The widget will consist of a table with two cells. One will contain the HTML being built here, and the other will be empty at first, and then store whatever relation is shown.
    // The cell with the views will be the one closer to the node - the left-hand one for start and the right-hand one for end.
    this.widgetTable = document.createElement('table');
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    this.widgetTable.appendChild(tbody);
    tbody.appendChild(row);
    this.containerDOM.appendChild(this.widgetTable);

    // Go ahead and create the cells for the table and relation, and append them in the correct order.
    const tableCell = document.createElement('td');

    // Build the toggle and refresh buttons
    const toggle = document.createElement('input');
    toggle.setAttribute("type", "button");
    toggle.setAttribute("idr", "toggle");
    toggle.setAttribute("value", "__");
    toggle.setAttribute("onclick", "app.widget('toggle', this)");
    tableCell.appendChild(toggle);

    const refresh = document.createElement('input');
    refresh.setAttribute("type", "button");
    refresh.setAttribute("idr", "refresh");
    refresh.setAttribute("value", "refresh");
    refresh.setAttribute("onclick", "app.widget('refresh', this)");
    tableCell.appendChild(refresh);


    this.relCell = document.createElement('td');
    this.relCell.setAttribute("idr", "relationsDOM");

    if (this.relationType == "start") { // Should see this order:  end relations, end view, node, start view, start relations
      row.appendChild(tableCell);
      row.appendChild(this.relCell);
    }
    else if (this.relationType == "end") {
      row.appendChild(this.relCell);
      row.appendChild(tableCell);
    }

    // Create the "Add Me" button. It starts off hidden if no one is logged in, visible if someone is.
    this.add = document.createElement("input");
    this.add.setAttribute("type", "button");
    this.add.setAttribute("idr", "addMe");
    this.add.setAttribute("value", "Add Me");
    this.add.setAttribute("onclick", "app.widget('addUser', this)");
    if (app.login.userID === null) {
      this.add.setAttribute("hidden", "true");
    }

    // build the table of views, to go in the tableCell.
    this.viewTable = document.createElement('table');
    const innerThead = document.createElement('thead');
    const innerTbody = document.createElement('tbody');
    this.viewTable.appendChild(innerThead);
    this.viewTable.appendChild(innerTbody);

    if (this.relationType === 'start') {
      innerThead.innerHTML = `<tr><th>ID</th><th>Name</th><th>Show</th></tr>`;
    }
    else if (this.relationType === 'end') {
      innerThead.innerHTML = `<tr><th>Show</th><th>Name</th><th>ID</th></tr>`;
    }
    else {
      alert ("Error: Relation type not defined");
    }
    for (let i in data) {
      const innerRow = document.createElement('tr');

      const IDcell = document.createElement('td');
      const ID = document.createTextNode(`${data[i].ID}`);
      IDcell.appendChild(ID);
      IDcell.setAttribute("idr", `id${i}`);

      const buttonCell = document.createElement('td');
      const button = document.createElement('input');
      button.setAttribute("type", "button");
      button.setAttribute("idr", `showRelations${i}`);
      button.setAttribute("value", "+");
      button.setAttribute("onclick", "app.widget('toggleRelation', this)");
      buttonCell.appendChild(button);

      const nameCell = document.createElement('td');
      const name = document.createTextNode(`${data[i].name}`)
      nameCell.appendChild(name);

      const dataID = data[i].ID.low;
      if (app.login.userID && app.login.userID.low == dataID) {      // if this row represents the logged-in user...
        innerRow.classList.add("loggedInView", "activeView");           // format it...
        nameCell.setAttribute("idr", "loggedInView");                // give the cell with their name an idr, so it can be logged and replayed...
        nameCell.setAttribute("ondrop", "app.widget('drop', this, event)")  // give the cell with their name an ondrop, so data can be dropped in...
        nameCell.setAttribute("ondragover", "app.widget('allowDrop', this, event)"); // and an ondragover, so data can be dropped...
        this.add.setAttribute("hidden", "true");                     // hide the "Add Me" button because the user is already shown...
        button.setAttribute("value", "__")                           // set the toggle button to "__" because the relation will be shown...
        this.activeToggle = button;
        this.toggleRelation();                                       // and automatically show their view (pending).
      }

      if (this.relationType === 'start') {
        innerRow.appendChild(IDcell);
        innerRow.appendChild(nameCell);
        innerRow.appendChild(buttonCell);
      }
      else if (this.relationType === 'end') {
        innerRow.appendChild(buttonCell);
        innerRow.appendChild(nameCell);
        innerRow.appendChild(IDcell);
      }
      innerTbody.appendChild(innerRow);

      this.rows++; // update the number of rows shown in the table
    } // end for (building table one row at a time)


    // Once the viewTable is made, append it and the add button
    tableCell.appendChild(this.viewTable);
    tableCell.appendChild(this.add);

    // After everything is built:
    const loginObj = {};  // Add an object describing a call to this.onLogin() to the doOnLogin array
    loginObj.object = this;
    loginObj.method = "onLogin";
    loginObj.args = [];
    app.login.doOnLogin.push(loginObj);

    const logoutObj = {}; // Add an object describing a call to this.onLogout() to the doOnLogout array
    logoutObj.object = this;
    logoutObj.method = "onLogout";
    logoutObj.args = [];
    app.login.doOnLogout.push(logoutObj);

    if (this.object && this.objectMethod) { // If an object and object method were passed in, run them, then delete them so they don't run a second time.
      this.object[this.objectMethod]();
      this.object = null;
      this.objectMethod = null;
    }
  }

  toggleRelation(button) {
    if (button) { // If a button was clicked, toggle the relation associated with it.
      if (button.value == "+") { // we are opening a relation
        button.value = "__";
        // Hide any relation that's already active
        if (this.activeDOM) {
          this.activeDOM.setAttribute("hidden", "true");
        }
        // Remove formatting from the old active row and change the active toggle button back to +
        if (this.activeToggle) {
          const activeRow = this.activeToggle.parentElement.parentElement;
          activeRow.classList.remove("activeView");
          this.activeToggle.setAttribute("value", "+");
        }

        // Get the ID associated with this button
        const row = button.parentElement.parentElement;
        const rowNum = button.getAttribute("idr").substring(13);
        const idCell = app.domFunctions.getChildByIdr(row, `id${rowNum}`);
        const ID = idCell.textContent;

        // See whether the view already exists
        if (ID in this.relations) {
          this.relations[ID].removeAttribute("hidden"); // If so, just make it visible and active.
          this.activeDOM = this.relations[ID];
        }
        else { // If not, create it in a new div and append it to relCell.
          const relDOM = document.createElement('div');
          this.relCell.appendChild(relDOM);
          new widgetRelations(relDOM, this.nodeID, ID, this.relationType);
          this.relations[ID] = relDOM;
          this.activeDOM = relDOM;
        }
        this.activeToggle = button;

        // Format the row
        row.classList.add("activeView");
      } // end if (opening a relation)
      else { // we are closing a relation
        button.value = "+";

        // Hide the active relation
        this.activeDOM.setAttribute("hidden", "true");

        // Remove formatting from the old active row
        const activeRow = button.parentElement.parentElement;
        activeRow.classList.remove("activeView");

        // reset active relation and toggle to null
        this.activeDOM = null;
        this.activeToggle = null;
      }

      // If a button was clicked, whether to open or close a relation, log it.
      const obj = {};
      obj.id = app.domFunctions.widgetGetId(button);
      obj.idr = button.getAttribute("idr");
      obj.action = "click";
      app.regression.log(JSON.stringify(obj));
      app.regression.record(obj);
    } // end if (button was clicked)
    else {  // If no button was clicked, toggleRelation is being called automatically to open the logged-in user's view.
      const ID = app.login.userID;
      // Check whether user's view already exists
      if (ID in this.relations) {
        this.relations[ID].removeAttribute("hidden"); // If so, just make it visible
      }
      else { // If not, create it in a new div and append it to relCell.
        // If an object and object method were passed in and not yet run, pass them along, then delete them so they don't run a second time.
        // This is needed because toggleRelation may run automatically as a view is loading for the first time.
        let object;
        let method;
        if (this.object && this.objectMethod) {
          object = this.object;
          method = this.objectMethod;
          this.object = null;
          this.objectMethod = null;
        }
        const relDOM = document.createElement('div');
        this.relCell.appendChild(relDOM);
        new widgetRelations(relDOM, this.nodeID, ID, this.relationType, object, method);
        this.relations[ID] = relDOM;
        this.activeDOM = relDOM;
      }
    }
  }

  refresh(button) {
    this.relations = {}; // reset list of existing relation DOM objects
    const query = `match (user)-[:Owner]->(view:View {direction:"${this.relationType}"})-[:Subject]->(node) where id(node) = ${this.nodeID} return ID(user) as ID, user.name as name order by name, ID`;
    this.db.setQuery(query);

    // log click
    const obj = {};
    obj.id = app.domFunctions.widgetGetId(button);
    obj.idr = button.getAttribute("idr");
    obj.action = "click";
    app.regression.log(JSON.stringify(obj));
    app.regression.record(obj);

    this.db.runQuery(this, "buildViews");
  }

  toggle (button) {
    if (button.value ==="+") { // If we're expanding
      button.value = "__";

      // Show all the button's siblings
      let sibling = button.nextElementSibling;
      while (sibling) {
        sibling.hidden = false;
        sibling = sibling.nextElementSibling;
      }
      this.relCell.hidden = false;
    }

    else { // we're collapsing
      button.value = "+";

      // Hide all the button's siblings
      let sibling = button.nextElementSibling;
      while (sibling) {
        sibling.hidden = true;
        sibling = sibling.nextElementSibling;
      }
      this.relCell.hidden = true;
    }

    // log
    const obj = {};
    obj.id = app.domFunctions.widgetGetId(button);
    obj.idr = button.getAttribute("idr");
    obj.action = "click";
    app.regression.log(JSON.stringify(obj));
    app.regression.record(obj);
  }

  drop(viewName, evnt) {
    const dataText = evnt.dataTransfer.getData("text/plain");
    const data = JSON.parse(dataText);

    let comment = "";
    if ('comment' in data) {
      comment = data.comment;
    }

    // let nodeID = "";
    // let name = "";
    // let type = "";
    // if ('nodeID' in data) { // if ONE of these three exists, they should ALL exist.
    //
    // }

    const userViewDOM = this.relations[app.login.userID]; // DOM element containing the user's view
    const dragDropDOM = userViewDOM.lastElementChild; // The dragDrop widget
    const dragDropID = dragDropDOM.getAttribute("id");
    const dragDropObj = app.widgets[dragDropID];  // The javascript object for the dragDrop widget

    const tbody = app.domFunctions.getChildByIdr(dragDropDOM, "container");
    const inputRow = app.domFunctions.getChildByIdr(tbody, "insertContainer");
    const numrows = tbody.children.length - 1; // Subtract 1 for the input row

    // Create new row
    const row = document.createElement('tr');
    row.setAttribute("idr", `item${dragDropObj.itemCount}`); // Assign an idr and increment itemCount in the dragDrop object
    row.setAttribute("ondrop", "app.widget('drop', this, event)");
    row.setAttribute("ondragover", "app.widget('allowDrop', this, event)");
    row.setAttribute("draggable", "true");
    row.setAttribute("ondragstart", "app.widget('drag', this, event)");

    const html = `<td></td>
                  <td></td>
                  <td ondragover="app.widget('allowDrop', this, event)" ondrop="app.widget('dropData', this, event)" idr="content${dragDropObj.contentCount++}">${data.nodeID}</td>
                  <td ondragover="app.widget('allowDrop', this, event)" ondrop="app.widget('dropData', this, event)" idr="content${dragDropObj.contentCount++}">${data.name}</td>
                  <td>${data.type}</td>
                  <td ondblclick="app.widget('edit', this, event)" idr="content${dragDropObj.contentCount++}">${comment}</td>
                  <td><input type="button" idr="delete${dragDropObj.itemCount++}" value="Delete" onclick="app.widget('markForDeletion', this)"></td>`

    row.innerHTML = html;
    row.classList.add("newData");
    tbody.insertBefore(row, inputRow);

    //log
    const obj = {};
    obj.id = app.domFunctions.widgetGetId(viewName);
    obj.idr = viewName.getAttribute("idr");
    obj.action = "drop";
    app.regression.log(JSON.stringify(obj));
    app.regression.record(obj);
  }

  allowDrop(input, evnt){ // the event doesn't take its default action
    evnt.preventDefault();
  }

  addUser(button) {
    // Create a view of this node for this user
    const query = `match (user), (subject) where ID(user) = ${app.login.userID} and ID(subject) = ${this.nodeID}
                   create (user)-[:Owner]->(:View {direction: "${this.relationType}"})-[:Subject]->(subject)`;
    this.db.setQuery(query);

    // Log click before running - just to be sure it will log BEFORE the data does
    const obj = {};
    obj.id = app.domFunctions.widgetGetId(button);
    obj.idr = button.getAttribute("idr");
    obj.action = "click";
    app.regression.log(JSON.stringify(obj));
    app.regression.record(obj);

    this.db.runQuery(this, 'addComplete');
  }

  addComplete(data) {
    // Add a row to the table for this user
    const innerRow = document.createElement('tr');

    const IDcell = document.createElement('td');
    const ID = document.createTextNode(`${app.login.userID}`);
    IDcell.appendChild(ID);
    IDcell.setAttribute("idr", `id${this.rows}`);

    const buttonCell = document.createElement('td');
    const button = document.createElement('input');
    button.setAttribute("type", "button");
    button.setAttribute("idr", `showRelations${this.rows++}`);  // Done using this.rows for this row, so increment it to be ready for the next one
    button.setAttribute("value", "__");
    button.setAttribute("onclick", "app.widget('toggleRelation', this)");
    buttonCell.appendChild(button);

    const nameCell = document.createElement('td');
    const name = document.createTextNode(`${app.login.userName}`)
    nameCell.appendChild(name);

    innerRow.classList.add("loggedInView", "activeView");           // format it...
    nameCell.setAttribute("idr", "loggedInView");                // give the cell with their name an idr, so it can be logged and replayed...
    nameCell.setAttribute("ondrop", "app.widget('drop', this, event)")  // give the cell with their name an ondrop, so data can be dropped in...
    nameCell.setAttribute("ondragover", "app.widget('allowDrop', this, event)");  // and an ondragover, so the data can be dropped...
    this.add.setAttribute("hidden", "true");                     // hide the "Add Me" button because the user is already shown...
    button.setAttribute("value", "__")                           // set the toggle button to "__" because the relation will be shown...
    if (this.activeToggle) {
      this.activeToggle.setAttribute("+");                         // reset the currently active toggle button to show + instead of __...
    }
    this.activeToggle = button;
    this.toggleRelation();                                       // and automatically show their view.

    if (this.relationType === 'start') {
      innerRow.appendChild(IDcell);
      innerRow.appendChild(nameCell);
      innerRow.appendChild(buttonCell);
    }
    else if (this.relationType === 'end') {
      innerRow.appendChild(buttonCell);
      innerRow.appendChild(nameCell);
      innerRow.appendChild(IDcell);
    }
    this.viewTable.lastElementChild.appendChild(innerRow); // Append the new row to the tbody of the table of views

    // Log
    const obj = {};
    obj.data = data;
    app.stripIDs(obj.data);
    app.regression.log(JSON.stringify(obj));
    app.regression.record(obj);
  }

  onLogin() {
    // Show Add Me button
    this.add.removeAttribute("hidden");

    //Find user name in table
    let IDcolumn;
    let toggleColumn;
    if (this.relationType == "start") {
      IDcolumn = 0;
      toggleColumn = 2;
    }
    else if (this.relationType == "end") {
      toggleColumn = 0;
      IDcolumn = 2;
    }
    const tbody = this.viewTable.lastElementChild;
    const rows = Array.from(tbody.children); // Get the element's children
    for (let i=0; i<rows.length; i++) {
      const IDcell = rows[i].children[IDcolumn];
      const ID = IDcell.textContent;
      if (ID == app.login.userID) {                                  // If the ID for this row matches the logged-in user...
        const toggleCell = rows[i].children[toggleColumn];
        const nameCell = rows[i].children[1];

        rows[i].classList.add("loggedInView", "activeView");            // format it...
        nameCell.setAttribute("idr", "loggedInView");                // give the cell with their name an idr, so it can be logged and replayed...
        nameCell.setAttribute("ondrop", "app.widget('drop', this, event)")  // give the cell with their name an ondrop, so data can be dropped in...
        nameCell.setAttribute("ondragover", "app.widget('allowDrop', this, event)");  // and an ondragover, so data can be dropped...
        this.add.setAttribute("hidden", "true");                     // hide the "Add Me" button because the user is already shown...

        const toggleButton = toggleCell.firstElementChild;
        toggleButton.setAttribute("value", "__");                    // change its toggle button to __ because the view will be visible
        this.activeToggle = toggleButton;
        this.toggleRelation();                                       // and automatically show their view (pending).
      } // end if (row matches logged-in user)
    } // end for (all rows)
  } // end onLogin

  onLogout() {
    // Hide "Add Me" button
    this.add.setAttribute("hidden", "true");

    // Remove all relations from the DOM and the relations object
    for (let ID in this.relations) {
      const relDOM = this.relations[ID];
      this.relCell.removeChild(relDOM);
    }
    this.relations = {};

    this.activeDOM = null;
    this.activeToggle = null;

    let toggleColumn;
    if (this.relationType == "start") {
      toggleColumn = 2;
    }
    else if (this.relationType == "end") {
      toggleColumn = 0;
    }

    // Look for the user's name in the Views table. If found, change it back to an ordinary entry. Also remove activeView from any row containing it
    const tbody = this.viewTable.lastElementChild;
    const rows = Array.from(tbody.children);
    for (let i=0; i<rows.length; i++) {
      const toggleCell = rows[i].children[toggleColumn];            // ALL views will now be hidden, so all toggle buttons should say +.
      const toggleButton = toggleCell.firstElementChild;
      toggleButton.setAttribute("value", "+");

      if (rows[i].classList.contains("loggedInView")) { // If this row used to represent the logged-in user...
        rows[i].classList.remove("loggedInView")        // remove formatting...
        const nameCell = rows[i].children[1];
        nameCell.removeAttribute("idr");                // remove idr, ondragover and ondrop.
        nameCell.removeAttribute("ondrop");
        nameCell.removeAttribute("ondragover");
      } // end if (row matches logged-in user)
      if (rows[i].classList.contains("activeView")) {
        rows[i].classList.remove("activeView")        // remove formatting.
      }
    } // end for (all rows)
  } // end onLogout
}
