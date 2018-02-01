/*

add/edit one node in a form

input: label
       data is optional.  Add mode is used if data is not supplied

*/

class widgetNode {
constructor(label, data) {
  this.data        = data; // is db identifier, not defined means add
  this.label       = label;
  this.idWidget    = app.idGet(0);
//  this.addSave     = app.idGet(1);
  this.addSaveDOM  = {} // place holder
//  this.table       = app.idGet(2);
  this.tableDOM    = {} // place holder
//  this.delete       = app.idGet(3); // Is this ever used? I can't find a reference to it, and it seems to refer to a null object
//  this.deleteDOM    = {} // place holder
  this.queryObject = app.metaData.getNode(label);
  this.fields      = this.queryObject.fields;
  this.db          = new db() ; // placeholder for add

  this.buildWidget();
  this.buildData();
}


////////////////////////////////////////////////////////////////////
buildWidget() { // public - build table header
  const html = app.widgetHeader() +'<b> ' + this.label +` </b>
  <input idr = "addSaveButton" type="button" onclick="app.widget('saveAdd',this)">
  <table idr = "nodeTable">
  </table>
 </div>
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

  this.addSaveDOM = app.getChildByIdr(widget, "addSaveButton");
  this.tableDOM   = app.getChildByIdr(widget, "nodeTable");
//  this.deleteDOM  = document.getElementById(this.delete);
}


buildData() {
  // put in one field label and input row for each field
  let fieldCount = 0;
  var value = "";

  // Clear any existing data
  while (this.tableDOM.hasChildNodes()) {
    this.tableDOM.removeChild(this.tableDOM.firstChild);
  }

  for (var fieldName in this.fields) {
    // Create a table row
    let row = document.createElement('tr');
    this.tableDOM.appendChild(row);

    // Create the first cell, a th cell containing the label as text
    let header = document.createElement('th');
    row.appendChild(header);
    let labelText = document.createTextNode(this.fields[fieldName].label);
    header.appendChild(labelText);

    // Create the second cell, a td cell containing an input which has an idr, an onChange event, and a value which may be an empty string
    if (this.data) {
      let d=this.data.properties;
      value = d[fieldName];
    }

    let dataField = document.createElement('td');
    row.appendChild(dataField);
    let input = document.createElement('input');
    dataField.appendChild(input);
    input.outerHTML = `<input db = ${fieldName} idr = "input${fieldCount++}" onChange = "app.widget('changed',this)" value = ${value}>`
  }

  // set the button to be save or added
  if (this.data) {
    this.addSaveDOM.value = "Save";
  } else {
    this.addSaveDOM.value = "Add";
  }
}


saveAdd(widgetElement) {
  // director function
  if (widgetElement.value === "Save") {
    this.save(widgetElement);
  } else {
    this.add(widgetElement);
  }

  // // log
  // let obj = {};
  // obj.id = app.widgetGetId(widgetElement);
  // obj.idr = widgetElement.getAttribute("idr");
  // obj.value = widgetElement.value;
  // obj.action = "click";
  // app.log(JSON.stringify(obj));
  // app.record(obj);
}


////////////////////////////////////////////////////////////////////
add(widgetElement) { // public - build table header
  // CREATE (n:person {name:'David Bolt', lives:'Knoxville'}) return n

  let tr = this.tableDOM.firstElementChild;

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
  // log
  let obj = {};
  obj.id = this.idWidget;
  obj.idr = "addSaveButton";
  obj.action = "click";
  app.regression.log(JSON.stringify(obj));
  app.regression.record(obj);
}


changed(input) {
  if (!this.data) {
    let obj = {};
    obj.id = app.widgetGetId(input);
    obj.idr = input.getAttribute("idr");
    obj.value = input.value;
    obj.action = "change";
    app.regression.log(JSON.stringify(obj));
    app.regression.record(obj);
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
  obj.action = "change";
  app.regression.log(JSON.stringify(obj));
  app.regression.record(obj);
}


save(widgetElement) { // public - build table header
/*
  MATCH (n)
  WHERE id(n)= 146
  SET n.born = 2003  // loop changed
  RETURN n
*/

  let tr = this.tableDOM.firstElementChild;

  const create = "match (n) where id(n)=" +this.data.identity+ " set #data# return n";
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

  const query = create.replace("#data#", data.substr(0,data.length-2) );
  this.db = new db();
  this.db.setQuery(query);
  this.db.runQuery(this,"saveData");
}

saveData(data) {
  // redo from as edit now that data is saved
  this.data = data[0].n;
  this.buildData();
  // log
  let obj = {};
  obj.id = this.idWidget;
  obj.idr = "addSaveButton";
  obj.action = "click";
  app.regression.log(JSON.stringify(obj));
  app.regression.record(obj);
}


// trash(domElememt) {
//   // set _trash = "comment why deleting" - remove from trash, removes the attribute
//   let comment = prompt("Reson for moving item to trash");
//   if (!comment) return;
//
//   let query = 'match (n) where id(n) =' + this.data.identity +
//   ' set _trash="' + comment +'"';
//   alert(query);
//   //this.data;
// }


// ////////////////////////////////////////////////////////////////////
// getAtt(element,attName) { // private -----------
// 	/*
//   input - element - is DOM input Object
//           attName - name of attribute in db
//   return - attribute value from db
// 	*/
//   const ret = element.getAttribute("db").split(attName+":")[1].split(";")[0].trim();
// 	return(ret);
// }

// /* */
// edit(domElement) {
//   // edit row - move values from click to input nextElementSibling
//   let th = document.getElementById(this.idHeader).firstElementChild.firstElementChild;
//   while(domElement){
//     th.firstElementChild.value = domElement.textContent;
//     domElement=domElement.nextElementSibling;
//     th = th.nextElementSibling;
//   }
//
// }


}
