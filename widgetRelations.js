/*

add/edit relations for a node

input: node
      relation - start | end | peer
      userNodeID - where relation order is stored
*/


class widgetRelations {
constructor(containerDOM, nodeID, relationType, id) {
  // data to be displayed
  this.containerDOM = containerDOM  // place to set innerHTML
  this.nodeID       = nodeID;       // neo4j node id where relationship starts
  this.id           = id;           // ID of the widget to be created
  this.relationType = relationType;

  this.idrContent   = 0;            // Number of existing editable cells added to table
  this.idrRow       = 0;            // Number of existing rows added to the table

  // DOM pointers to data that will change, just make place holders
  // this.widgetDOM   = {};

  this.db          = new db() ;
  this.db.setQuery( // set query based on relationType
    (r => {switch (r) {
    case "start": return `match (n)-[r]->()  where id(n)=${this.nodeID} return r`; break;
    case "end":   return `match  ()-[r]->(n) where id(n)=${this.nodeID} return r`; break;
    case "peer":  return "";  break;// not finished
    default: alert("error"); // better error handling
  }}) (relationType)
  );

  this.buildRelations(); // runsbuildRelationsStart();
}


buildRelations() { // queries for relations which end at this node, then sends the results to endComplete()
  this.db.runQuery(this,"rComplete");
}

rComplete(data) {
  this.containerDOM.setAttribute("id", this.id.toString());
  this.containerDOM.setAttribute("class", "widget");
  this.containerDOM.innerHTML = `<input idr = "toggle" type="button" value="." onclick="app.widget('toggle',this)"><input idr = "SaveSync" type="Button" value="Save and Sync" onclick="app.widget('saveSync', this)">
    <table>${this.complete(data)}</table>`;
    setTimeout(this.createDragDrop, 1, this);
//  this.containerDOM = app.domFunctions.getChildByIdr(this.widgetDOM, "end"); // button
}

createDragDrop(widgetRel) {
  const dragDrop = app.dragDropTableNew("template", "container", widgetRel.containerDOM, widgetRel.idrRow, widgetRel.idrContent);
}

saveSync(button) {
  const widgetID = app.domFunctions.widgetGetId(button);
  const widget = document.getElementById(widgetID);
  const container = app.domFunctions.getChildByIdr(widget, "container");
  const rows = Array.from(container.children);
  this.processNext(null, rows);
}

processNext(data, rows) {
  if (rows.length >0) {
    const row = rows.pop();
    if (row.classList.contains("deletedData")) {
      this.deleteNode(row, rows);
    }
    else if (row.classList.contains("newData")) {
      this.addNode(row, rows);
    }
    else if (row.classList.contains("changedData")) {
      this.changeNode(row, rows);
    }
    else { // If the row doesn't need any processing, just move on
      this.processNext(null, rows);
    }
  }
  else { // when all rows are processed
    // Once the DB has updated, refresh the widget
    this.db.setQuery( // set query based on relationType
      (r => {switch (r) {
      case "start": return `match (n)-[r]->()  where id(n)=${this.nodeID} return r`; break;
      case "end":   return `match  ()-[r]->(n) where id(n)=${this.nodeID} return r`; break;
      case "peer":  return "";  break;// not finished
      default: alert("error"); // better error handling
    }}) (this.relationType)
    );

    this.buildRelations();
  }
}

deleteNode(row, rows) {
  const cells = row.children;
  const idCell = cells[1];
  const id = idCell.textContent;
  this.db.setQuery(`match ()-[r]-() where ID(r) = ${id} delete r`);
  this.db.runQuery(this, "processNext", rows);
}

addNode(row, rows) {
  const widgetID = app.domFunctions.widgetGetId(row);
  const widget = document.getElementById(widgetID);
  const headerRow = app.domFunctions.getChildByIdr(widget, "template");
  const headers = headerRow.children;

  const cells = row.children;
  const relIDcell = cells[1];
  const relID = relIDcell.textContent;
  const nodeIDcell = cells[2];
  let otherNodeID;
  if (nodeIDcell.textContent != "") {
    otherNodeID = nodeIDcell.textContent;
  }
  else {
    otherNodeID = this.nodeID;
  }

  // The exact query will depend on whether this widget is for incoming, outgoing or directionless relations. Incoming and outgoing are easy, and I can write them now.
  // Cypher doesn't actually use directionless relations, so I need to ask Uncle Dvaid how he plans to model them before writing code to deal with them.
  const queryStart =     (r => {switch (r) {
      case "start": return `match (a), (b) where ID(a) = ${this.nodeID} and id(b) = ${otherNodeID} create (a)-[r:Relation`; break;
      case "end":   return `match (a), (b) where ID(a) = ${otherNodeID} and id(b) = ${this.nodeID} create (a)-[r:Relation`; break;
      case "peer":  return "";  break;// not finished
      default: alert("error"); // better error handling
    }}) (this.relationType);

  const queryEnd = `]->(b) return r`;
  let attributes = "";

  for (let i = 3; i < headers.length-1; i++) {
    if (cells[i].textContent != "") {
      attributes += `${headers[i].textContent.toLowerCase()}:'${cells[i].textContent}', `
    }
  }

  if (attributes.length > 2) {
    attributes = attributes.substr(0, attributes.length-2); // remove the final comma and space
  }

  const query = queryStart + ` {${attributes}}` + queryEnd;

  this.db.setQuery(query);
  this.db.runQuery(this, "processNext", rows);
}

changeNode (row, rows) {
  // Apparently can't change the start or end node of a relationship. May have to delete and remake instead.
  // May as well do that every time, at least for now - it's easier than checking whether the nodeID has changed.
  // I'll change the row from changed to new, put it BACK in the array, and delete the relationship from the DB.
  // Then when it gets processed by processNext the second time, the relationship will get added.
  row.classList.remove("changedData");
  row.classList.add("newData");
  rows.push(row);
  this.deleteNode(row, rows);
}

//////////////////////////////////////////////////// below not reviewed

toggle(button){ // Shows or hides relations
  if (button.value ==="+") {
    button.value = ".";
    button.nextElementSibling.hidden = false;
  } else {
    button.value = "+";
    button.nextElementSibling.hidden = true;
  }
}


complete(data) { // Builds html for a table. Each row is a single relation and shows the number, the id, the end and the type of that relation.
  let html       = `<thead><tr idr='template'> <th>#</th> <th>R#</th> <th ondragover="app.widget('allowDrop', this, event)" ondrop ="app.widget('dropData', this, event)">N#</th> <th editable>Comment</th> </tr></thead><tbody idr='container'>`;
  this.idrRow     = 0;
  this.idrContent = 0;
  while (this.idrRow<data.length) { // add data
    let d= data[this.idrRow].r;

// <tr ondrop="dragDrop.drop(event)" ondragover="dragDrop.allowDrop(event)" draggable="true" ondragstart="dragDrop.drag(event)">
//<td ondblclick="dragDrop.edit(event)" idr="content0"></td>

// <td><input onchange="dragDrop.recordText(this)" onkeydown="dragDrop.addOnEnter(event, this)" idr="input0"></td>
// <td><input onchange="dragDrop.recordText(this)" onkeydown="dragDrop.addOnEnter(event, this)" idr="input1"></td></tr>
    const trDrag   = `<tr idr="item${this.idrRow}" ondrop="app.widget('drop', this, event)" ondragover="app.widget('allowDrop', this, event)" draggable="true" ondragstart="app.widget('drag', this, event)">`

    html += trDrag + `<td>${this.idrRow + 1}</td> <td>${d.identity}</td> <td ondragover="app.widget('allowDrop', this, event)" ondrop ="app.widget('dropData', this, event)">${d.end}</td>
                      <td ondblclick="app.widget('edit', this, event)" idr="content${this.idrContent++}">${d.properties.comment}</td><td><button idr="delete${this.idrRow++}" onclick="app.widget('markForDeletion', this)">Delete</button></td></tr>`;
  }
  return html + "</tbody>";
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

    data += inp.getAttribute("db") +":'" + inp.value +"', ";
    tr=tr.nextElementSibling;
  }


  const query = create.replace("#data#", data.substr(0,data.length-2) );
//  this.db = new db();
  this.db.setQuery(query);
  this.db.runQuery(this,"addComplete");
}


addComplete(data) { // Refreshes the node table and logs that addSave was clicked
  //this.data = data[0].n // takes single node
  this.dataNode = data[0].n // takes single nodes
  this.buildDataNode();
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
saveData(data) { // Refreshes the node table and logs that addSave was clicked
  // redo from as edit now that data is saved
  // alert(JSON.stringify(data));
  //this.data = data[0].n;
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
