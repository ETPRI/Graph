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

  this.idrContent   = 0;            // Number of existing relations added to table

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
  this.containerDOM.innerHTML = `<input idr = "toggle" type="button" value="." onclick="app.widget('toggle',this)">
    <table>${this.complete(data)}</table>`;
    setTimeout(this.createDragDrop, 1, this);
//  this.containerDOM = app.domFunctions.getChildByIdr(this.widgetDOM, "end"); // button
}

createDragDrop(widgetRel) {
  app.dragDrop = app.dragDropTableNew("template", "container", widgetRel.containerDOM, widgetRel.idrContent);    // new global variable, this needs to go // Changed it to belong to app
  app.dragDrop.addOnEnter = function(input, evnt) {
    if (evnt.key == "Enter") {
      const newRow = app.dragDrop.insert(input);
      widgetRel.addRelation(newRow);
    }
  }
}

addRelation(newRow) {
  let queryStart = `match (n) where id(n)=${this.nodeID} create (n)-[r:Relation`;
  const queryEnd = `]->(n) return r`;
  let attributes = "";
  const headerRow = document.getElementById("template");
  const headers = headerRow.children;
  const data = newRow.children;
  for (let i = 0; i < headers.length-1; i++) {
    if (data[i].textContent != "") {
      attributes += `${headers[i].textContent.toLowerCase()}:${data[i].textContent}, `
    }
  }

  if (attributes.length > 2) {
    attributes = attributes.substr(0, attributes.length-2); // remove the final comma and space
    queryStart += `{${attributes}}`; // and include the attributes in the query
  }

  const query = queryStart + queryEnd;
  alert (query);
  // THIS IS WHERE I LEFT OFF
}
// relationEnd(){ // Just updates "relationEnd" element; never seems to be called
//   document.getElementById("relationEnd").value   = this.dataNode.identity;
// }

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
  let html       = "<thead><tr idr='template'> <th>#</th> <th>R#</th> <th>N#</th> <th editable>Comment</th> </tr></thead><tbody idr='container'>";
  let idrRow     = 0;
  this.idrContent = 0;
  const trDrag   = `<tr ondrop="app.widget('drop', this, event)" ondragover="app.widget('allowDrop', this, event)" draggable="true" ondragstart="app.widget('drag', this, event)">`
  while (idrRow<data.length) { // add data
    let d= data[idrRow].r;

// <tr ondrop="dragDrop.drop(event)" ondragover="dragDrop.allowDrop(event)" draggable="true" ondragstart="dragDrop.drag(event)">
//<td ondblclick="dragDrop.edit(event)" idr="content0"></td>

// <td><input onchange="dragDrop.recordText(this)" onkeydown="dragDrop.addOnEnter(event, this)" idr="input0"></td>
// <td><input onchange="dragDrop.recordText(this)" onkeydown="dragDrop.addOnEnter(event, this)" idr="input1"></td></tr>

    html += trDrag + `<td>${++idrRow}</td> <td>${d.identity}</td> <td>${d.end}</td>
                      <td ondblclick="app.widget('edit', this, event)" idr="content${this.idrContent++}">${d.properties.comment}</td></tr>`;
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
