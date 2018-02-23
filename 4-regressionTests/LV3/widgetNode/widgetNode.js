/*

add/edit one node in a form - view Relations

input: label
       data is optional.  Add mode is used if data is not supplied
       navigate a graph -


       input: node ID

       match (a) where id(p)=0
       match (b) where id(a)=12
       create (a)-[:worksAt2 {}]->(b)
*/


class widgetNode {
constructor(label, id) {
  // DOM pointers to data that will change, just make place holders
  this.widgetDOM   = {};
  this.relationsFrom = {}; // place holder for relations ->(n)
  this.relationsTo   = {}; // place holder for relations   (n)->
  this.addSaveDOM  = {};
  this.tableDOM    = {};
  this.fromDOM     = {}; // Is this ever used?
  this.toDOM       = {}; // Is this ever used?
  this.endDOM      = {}; // sub widget
  this.startDOM    = {}; // sub widget

  this.label       = label;
  this.queryObject = app.metaData.getNode(label);
  this.fields      = this.queryObject.fields;

  this.idWidget = app.idGet(0);
  app.widgets[app.idCounter] = this; // Add to app.widgets

  this.db          = new db();

  // Get data for the given node ID, if it exists
  if (id) {
    this.db.setQuery(`match (n) where ID(n) = ${id} return n`);
    this.db.runQuery(this, 'finishConstructor');
  } else {
     this.finishConstructor();
   }
}

finishConstructor(data) {
  if (data) { // If data were passed in, add them to the table
    this.dataNode = data[0].n;
  }

  this.buildWidget();
  this.buildDataNode();

  if (data) { // I hate to do this twice, but I have to create dataNode before I can call buildWidget or buildDataNode, and I have to call buildWidget before buiildRelations.
    this.buildRelations();
  }
}

buildRelations() {
  new widgetRelations(this.startDOM, this.dataNode.identity, "start", app.idCounter);
  new widgetRelations(this.endDOM, this.dataNode.identity, "end", app.idCounter);
}

buildWidget() { // public - build table header
  let id="";  // assume add mode
  if (this.dataNode) {
    // we are edit mode
    id = this.dataNode.identity;
  }
  const html = app.widgetHeader() +`<table><tbody><tr>
  <td idr="end"></td>
  <td><b idr="nodeLabel">${this.label}#${id}</b>
    <input idr = "addSaveButton" type="button" onclick="app.widget('saveAdd',this)">
    <table idr = "nodeTable"></table>
  </td>
  <td idr="start"></td>
</tr></tbody></table></div>
`
  /*
  Create new element, append to the widgets div in front of existing widgets
  */
  let parent = document.getElementById('widgets');
  let child = parent.firstElementChild;
  let newWidget = document.createElement('div'); // create placeholder div
  parent.insertBefore(newWidget, child); // Insert the new div before the first existing one
  newWidget.outerHTML = html; // replace placeholder with the div that was just written

  // By this point, the new widget div has been created by buildHeader() and added to the page by the above line
  let widget = document.getElementById(this.idWidget);
  this.widgetDOM  = widget;
  this.addSaveDOM = app.domFunctions.getChildByIdr(widget, "addSaveButton");
  this.tableDOM   = app.domFunctions.getChildByIdr(widget, "nodeTable");
  this.endDOM     = app.domFunctions.getChildByIdr(widget, "end");
  this.startDOM   = app.domFunctions.getChildByIdr(widget, "start");
}


buildDataNode() {   // put in one field label and input row for each field
  let fieldCount = 0;
  var value = "";

  // Clear any existing data
  while (this.tableDOM.hasChildNodes()) {
    this.tableDOM.removeChild(this.tableDOM.firstChild);
  }

  for (var fieldName in this.fields) {
/* old david code
    let value="";   // assume add
    if (this.dataNode) {
      // this is an edit,
      value = this.dataNode.properties[fieldName];
    }
    //    <input db="name" idr="input0" onchange="app.widget('changed',this)" value="">
    html +=  `<tr><th>${this.fields[fieldName].label}</th><td><input db="${fieldName}"
    idr="input${fieldCount++}" onChange="app.widget('changed',this)" value="${value}"</td></tr>`
*/
    // Create a table row
    let row = document.createElement('tr');
    this.tableDOM.appendChild(row);

    // Create the first cell, a th cell containing the label as text
    let header = document.createElement('th');
    row.appendChild(header);
    let labelText = document.createTextNode(this.fields[fieldName].label);
    header.appendChild(labelText);

    // Create the second cell, a td cell containing an input which has an idr, an onChange event, and a value which may be an empty string
    if (this.dataNode) {
      let d=this.dataNode.properties;
      value = d[fieldName];
      value = value.replace(/"/g, "&quot;");
    }

    let dataField = document.createElement('td');
    row.appendChild(dataField);
    let input = document.createElement('input');
    dataField.appendChild(input);
    input.outerHTML = `<input db = ${fieldName} idr = "input${fieldCount++}" onChange = "app.widget('changed',this)" value = "${value}">`
  }

  // set the button to be save or added
  if (this.dataNode) {this.addSaveDOM.value = "Save";
  } else {this.addSaveDOM.value = "Add";}
}


saveAdd(widgetElement) { // Saves changes or adds a new node
  // director function
  if (widgetElement.value === "Save") {
    this.save(widgetElement);
  } else {
    this.add(widgetElement);
  }

  // // log
  // let obj = {};
  // obj.id = app.domFunctions.widgetGetId(widgetElement);
  // obj.idr = widgetElement.getAttribute("idr");
  // obj.value = widgetElement.value;
  // obj.action = "click";
  // app.log(JSON.stringify(obj));
  // app.record(obj);
}


////////////////////////////////////////////////////////////////////
add(widgetElement) { // Builds a query to add a new node, then runs it and passes the result to addComplete
  // CREATE (n:person {name:'David Bolt', lives:'Knoxville'}) return n

  let tr = this.tableDOM.firstElementChild;

  const create = "create (n:"+ this.label+" {#data#}) return n";
  let data="";
  while (tr) {
    let inp = tr.lastElementChild.firstElementChild;

    data += inp.getAttribute("db") +':"' + app.stringEscape(inp.value) +'", ';
    tr=tr.nextElementSibling;
  }


  const query = create.replace("#data#", data.substr(0,data.length-2) );
//  this.db = new db();
  this.db.setQuery(query);
  this.db.runQuery(this,"addComplete");
}


addComplete(data) { // Refreshes the node table and logs that addSave was clicked
  this.dataNode = data[0].n; // takes single nodes
  const id = this.dataNode.identity;
  const nodeLabel = app.domFunctions.getChildByIdr(this.widgetDOM, "nodeLabel");
  nodeLabel.textContent=`${this.label}#${id}`;

  this.buildDataNode();
  this.buildRelations();
  // log
  let obj = {};
  obj.id = this.idWidget;
  obj.idr = "addSaveButton";
  obj.action = "click";
  app.regression.log(JSON.stringify(obj));
  app.regression.record(obj);
}


changed(input) { // Logs changes to fields, and highlights when they are different from saved fields
  if (!this.dataNode) {
    let obj = {};
    obj.id = app.domFunctions.widgetGetId(input);
    obj.idr = input.getAttribute("idr");
    obj.value = input.value;
    obj.action = "change";
    app.regression.log(JSON.stringify(obj));
    app.regression.record(obj);
    return;  // no feedback in add mode, but do log the change
  }
  // give visual feedback if edit data is different than db data
  if (input.value === this.dataNode.properties[input.getAttribute('db')]) {
    input.setAttribute("class","");
  } else {
    input.setAttribute("class","changedData");
  }

  // log
  let obj = {};
  obj.id = app.domFunctions.widgetGetId(input);
  obj.idr = input.getAttribute("idr");
  obj.value = input.value;
  obj.action = "change";
  app.regression.log(JSON.stringify(obj));
  app.regression.record(obj);
}


save(widgetElement) { // Builds query to update a node, runs it and passes the results to saveData()
/*
  MATCH (n)
  WHERE id(n)= 146
  SET n.born = 2003  // loop changed
  RETURN n
*/

  let tr = this.tableDOM.firstElementChild;

  let data="";
  while (tr) {
    let inp = tr.lastElementChild.firstElementChild;  // find <input> element
    if(inp.getAttribute("class") === "changedData") {
      // create a set for this field
      let fieldName = inp.getAttribute("db");
      let d1 = "n."+ fieldName +"=#value#, ";
      let d2 = "";
      if (this.fields[fieldName].type === "number") {
        d2 = inp.value;  // number
      } else {
        d2 = '"' + app.stringEscape(inp.value) + '"';  // assume string
      }
      data += d1.replace('#value#',d2)
    }
    tr=tr.nextElementSibling;
  }

  if (data==="") {
    alert("no changes to save")
  } else {
    this.db.setQuery( `match (n) where id(n)=${this.dataNode.identity} set ${data.substr(0,data.length-2)} return n` );
    this.db.runQuery(this,"saveData");
  }
}
saveData(data) { // Refreshes the node table and logs that addSave was clicked
  // redo from as edit now that data is saved
  // alert(JSON.stringify(data));
  this.dataNode = data[0].n;
  this.buildDataNode();

  // log
  let obj = {};
  obj.id = this.idWidget;
  obj.idr = "addSaveButton";
  obj.action = "click";
  app.regression.log(JSON.stringify(obj));
  app.regression.record(obj);
}

} ///////////////////// endclass
