/*

navigate a graph -

input: node ID

A node is displayed -   [r1]->[N]->[r2]

match (n) where id(n)=#  retrun n  // get N

match [r]->[n]   where id(n)=# return r // get r1

match [n]->[r] where id(n)=# return r // get r2

display as

<div>


*/

class widgetGraph {
constructor(label, data) {
  this.data        = data; // is db identifier, not defined means add
  this.label       = label;
  this.idWidget    = app.idGet(0);
  this.addSaveDOM  = {} // place holder for button object
  this.tableDOM    = {} // place holder for tableDOm
  this.queryObject = app.metaData.getNode(label);
  this.fields      = this.queryObject.fields;
  this.db          = new db() ; // placeholder for add

  this.buildWidget();
  this.buildData();
}


buildWidget() { // public - build table header
  const html = app.widgetHeader('span') +`<b>${this.label}</b>
  <input idr = "addSaveButton" type="button" onclick="app.widget('saveAdd',this)">
  <table idr = "nodeTable">
  </table>
  </span>`

  // add new widget header to top of widget stack
  document.getElementById('widgets').innerHTML = html
    + document.getElementById('widgets').innerHTML;

  // By this point, the new widget div has been created by buildHeader() and added to the page by the above line
  let widget = document.getElementById(this.idWidget);

  this.addSaveDOM = app.getChildByIdr(widget, "addSaveButton");
  this.tableDOM   = app.getChildByIdr(widget, "nodeTable");
}


buildData() {   // put in one field label and input row for each field
  let html="";
  let fieldCount = 0;
  for (var fieldName in this.fields) {
    let value="";   // assume add
    if (this.data) {
      // this is an edit,
      value = this.data.properties[fieldName];
    }
    //    <input db="name" idr="input0" onchange="app.widget('changed',this)" value="">
    html +=  `<tr><th>${this.fields[fieldName].label}</th><td><input db="${fieldName}"
    idr="input${fieldCount++}" onChange="app.widget('changed',this)" value="${value}"</td></tr>`
  }
  this.tableDOM.innerHTML = html;

  // set the button to be save or added
  if (this.data) {this.addSaveDOM.value = "Save";
  } else {this.addSaveDOM.value = "Add";}
}


saveAdd(widgetElement) {
  // director function
  if (widgetElement.value === "Save") {
    this.save(widgetElement);
  } else {
    this.add(widgetElement);
  }

  // log
  let obj = {};
  obj.id = app.widgetGetId(widgetElement);
  obj.idr = widgetElement.getAttribute("idr");
  obj.value = widgetElement.value;
  app.log(JSON.stringify(obj));
}


////////////////////////////////////////////////////////////////////
add(widgetElement) { // public - build table header
  // CREATE (n:person {name:'David Bolt', lives:'Knoxville'}) return n

  let tr = this.tableDOM.firstElementChild.firstElementChild;

  const create = "create (n:"+ this.label+" {#data#}) return n";
  let data="";
  while (tr) {
    let inp = tr.lastElementChild.firstElementChild;

    data += inp.getAttribute("db") +":'" + inp.value +"', ";
    tr=tr.nextElementSibling;
  }


  const query = create.replace("#data#", data.substr(0,data.length-2) );
  this.db = new db();
  this.db.setQuery(query);
  this.db.runQuery(this,"addComplete");
}


addComplete(data) {
  this.data = data[0].n // takes single nodes
  this.buildData();
}


changed(input) {
  if (!this.data) {
    let obj = {};
    obj.id = app.widgetGetId(input);
    obj.idr = input.getAttribute("idr");
    obj.value = input.value;
    app.log(JSON.stringify(obj));
    return;  // no feedback in add mode, but do log the change
  }
  // give visual feedback if edit data is different than db data
  if (input.value === this.data.properties[input.getAttribute('db')]) {
    input.setAttribute("class","");
  } else {
    input.setAttribute("class","changedData");
  }

  // log
  let obj = {};
  obj.id = app.widgetGetId(input);
  obj.idr = input.getAttribute("idr");
  obj.value = input.value;
  app.log(JSON.stringify(obj));
}


save(widgetElement) { // public - build table header
/*
  MATCH (n)
  WHERE id(n)= 146
  SET n.born = 2003  // loop changed
  RETURN n
*/

  let tr = this.tableDOM.firstElementChild.firstElementChild;

  let data="";
  while (tr) {
    let inp = tr.lastElementChild.firstElementChild;  // find <input> element
    if(inp.getAttribute("class") === "changedData") {
      // create a set for this field
      let fieldName = inp.getAttribute("db")
      let d1 = "n."+ fieldName +"=#value#, ";
      let d2 = "";
      if (this.fields[fieldName].type === "number") {
        d2 = inp.value;  // number
      } else {
        d2 = '"' + inp.value + '"';  // assume string
      }
      data += d1.replace('#value#',d2)
    }
    tr=tr.nextElementSibling;
  }

  if (data==="") {
    alert("no changes to save")
  } else {
    const query = `match (n) where id(n)=${this.data.identity} set ${data.substr(0,data.length-2)} return n`;
    this.db = new db();
    this.db.setQuery(query);
    this.db.runQuery(this,"saveData");
  }
}


saveData(data) {
  // redo from as edit now that data is saved
  this.data = data[0].n;
  this.buildData();
}



} ///////////////////// endclass
