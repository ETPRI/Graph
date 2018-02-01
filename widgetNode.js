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
constructor(label, data) {
  // data to be dislplayed
  this.dataNode    = data; // is db identifier, not defined means add
  this.relationsFrom = {}; // place holder for relations ->(n)
  this.relationsTo   = {}; // place holder for relations   (n)->
  this.label       = label;
  this.idWidget    = app.idGet(0);

  // DOM pointers to data that will change, just make place holders
  this.widgetDOM   = {};
  this.addSaveDOM  = {};
  this.tableDOM    = {};
  this.fromDOM     = {};
  this.toDOM       = {};
  this.endDOM      = {}; // button
  this.startDOM    = {}; // button

  this.queryObject = app.metaData.getNode(label);
  this.fields      = this.queryObject.fields;
  this.db          = new db() ; // placeholder for add

  this.buildWidget();
  this.buildDataNode();
  this.buildRelationsEnd(); // runsbuildRelationsStart();
}


buildRelationsEnd() {
  if (!this.dataNode) return;  // new node, so no relations
  this.db.setQuery( `match ()-[r]->(n) where id(n)=${this.dataNode.identity} return r` );
  this.db.runQuery(this,"endComplete");
}
endComplete(data) {
  this.fromDOM.innerHTML = `<input idr = "toggle" type="button" value="." onclick="app.widget('toggle',this)">
    <table>${this.complete(data)}</table>`;
  this.endDOM = app.getChildByIdr(this.widgetDOM, "end"); // button
  this.buildRelationsStart();
}
relationEnd(){
  document.getElementById("relationEnd").value   = this.dataNode.identity;
}
toggle(button){
  if (button.value ==="+") {
    button.value = ".";
    button.nextElementSibling.hidden = false;
  } else {
    button.value = "+";
    button.nextElementSibling.hidden = true;
  }
}


buildRelationsStart() {
  if (!this.dataNode) return;  // new node, so no relations
  this.db.setQuery( `match (n)-[r]->() where id(n)=${this.dataNode.identity} return r` );
  this.db.runQuery(this,"startComplete");
}
startComplete(data) {
  this.toDOM.innerHTML = `<input idr = "start" type="button" value="Start" onclick="app.widget('relationStart',this)">
    <table>${this.complete(data)}</table>`;
  this.startDOM  = app.getChildByIdr(this.widgetDOM, "start"); // button
}
relationStart(){
  this.startDOM.setAttribute('style','background-color: yellow');
  document.getElementById("relationStart").value   = this.dataNode.identity; // remember node that starts relation
}

complete(data){
  let html = "<tr> <th>#</th> <th>R#</th> <th>N#</th> <th>Relation type</th> </tr>";
  for(let i=0; i<data.length; i++) {
    let d= data[i].r
    html += `<tr><td>${i}</td> <td>${d.identity}</td> <td>${d.end}</td> <td>${d.type}</td></tr>`;
  }
  return html;
}


buildWidget() { // public - build table header
  let id="";  // assume add mode
  if (this.dataNode) {
    // we are edit mode
    id = this.dataNode.identity;
  }
  const html = app.widgetHeader() +`<table><tr>><td idr="from"></td>
  <td><b>${this.label}#${id}</b>
  <input idr = "addSaveButton" type="button" onclick="app.widget('saveAdd',this)">
  <table idr = "nodeTable">
  </table></td>
  <td idr="to"></td>
  </tr></table>
  </div>`

  // add new widget header to top of widget stack
  document.getElementById('widgets').innerHTML = html
    + document.getElementById('widgets').innerHTML;

  // By this point, the new widget div has been created by buildHeader() and added to the page by the above line
  let widget = document.getElementById(this.idWidget);
  this.widgetDOM  = widget;
  this.addSaveDOM = app.getChildByIdr(widget, "addSaveButton");
  this.tableDOM   = app.getChildByIdr(widget, "nodeTable");
  this.fromDOM    = app.getChildByIdr(widget, "from");
  this.toDOM      = app.getChildByIdr(widget, "to");
}


buildDataNode() {   // put in one field label and input row for each field
  let html="";
  let fieldCount = 0;
  for (var fieldName in this.fields) {
    let value="";   // assume add
    if (this.dataNode) {
      // this is an edit,
      value = this.dataNode.properties[fieldName];
    }
    //    <input db="name" idr="input0" onchange="app.widget('changed',this)" value="">
    html +=  `<tr><th>${this.fields[fieldName].label}</th><td><input db="${fieldName}"
    idr="input${fieldCount++}" onChange="app.widget('changed',this)" value="${value}"</td></tr>`
  }
  this.tableDOM.innerHTML = html;

  // set the button to be save or added
  if (this.dataNode) {this.addSaveDOM.value = "Save";
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
//  this.db = new db();
  this.db.setQuery(query);
  this.db.runQuery(this,"addComplete");
}


addComplete(data) {
  this.dataNode = data[0].n // takes single nodes
  this.buildDataNode();
}


changed(input) {
  if (!this.dataNode) {
    let obj = {};
    obj.id = app.widgetGetId(input);
    obj.idr = input.getAttribute("idr");
    obj.value = input.value;
    app.log(JSON.stringify(obj));
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
      let fieldName = inp.getAttribute("db");
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
    this.db.setQuery( `match (n) where id(n)=${this.dataNode.identity} set ${data.substr(0,data.length-2)} return n` );
    this.db.runQuery(this,"saveData");
  }
}
saveData(data) {
  // redo from as edit now that data is saved
  this.dataNode = data[0].n;
  this.buildDataNode();
}



} ///////////////////// endclass
