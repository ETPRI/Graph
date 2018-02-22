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
  this.existingRelations = {};

  this.idrContent   = 0;            // Number of existing editable cells added to table
  this.idrRow       = 0;            // Number of existing rows added to the table

  app.widgets[app.idCounter++] = this;

  // DOM pointers to data that will change, just make place holders
  // this.widgetDOM   = {};

  this.db          = new db() ;
  this.db.setQuery( // set query based on relationType
    (r => {switch (r) {
    case "start": return `match (n)-[r]->(a)  where id(n)=${this.nodeID} return r, a`; break;
    case "end":   return `match  (a)-[r]->(n) where id(n)=${this.nodeID} return r, a`; break;
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
	let dragDrop = new dragDropTable("template", "container", widgetRel.containerDOM, widgetRel.idrRow, widgetRel.idrContent);
  dragDrop.editDOM.setAttribute("onblur", " app.widget('changeComment', this); app.widget('save', this)");
  dragDrop.existingRelations = JSON.parse(JSON.stringify(widgetRel.existingRelations)); // Makes a copy of this.existingRelations
  dragDrop.changeComment = function(input) { // input should be the edit object, which is still attached to the row being edited
    const commentCell = input.parentElement;
    const row = commentCell.parentElement;
    const IDcell = row.children[1];
    const ID = IDcell.textContent;

    if (ID in this.existingRelations) {
      if (input.value != this.existingRelations[ID].comment) {
        commentCell.classList.add("changedData");
      }
      else {
        commentCell.classList.remove("changedData");
      }
    }
  } // end dragdrop.changeComment function

  dragDrop.dropData = function(input, evnt) { // If data is dragged to a cell with ondrop = dropData
    let row = input.parentElement;
    let idr = row.getAttribute("idr");

    if (idr == "insertContainer") { // If a node is dragged to the insert row, create a new row and add the data to that.
      row = this.insert();
      idr = row.getAttribute("idr");
    }

    if (idr != "template") { // Verify that the cell is not in the template row...
      const data = JSON.parse(evnt.dataTransfer.getData("text/plain")); // then parse the data and add it to each cell
      const nodeIDcell = row.children[2];
      nodeIDcell.textContent = data.nodeID;
      const nameCell = row.children[3];
      nameCell.textContent = data.name;
      const typeCell = row.children[4];
      typeCell.textContent = data.type;

      // add changedData class if necessary
      const IDcell = row.children[1];
      const ID = IDcell.textContent;
      if (ID in this.existingRelations) {
        if (nodeIDcell.textContent != this.existingRelations[ID].nodeID) {
          nodeIDcell.classList.add("changedData");
        } else {
          nodeIDcell.classList.remove("changedData");
        }

        if (nameCell.textContent != this.existingRelations[ID].name) {
          nameCell.classList.add("changedData");
        } else {
          nameCell.classList.remove("changedData");
        }

        if (typeCell.textContent != this.existingRelations[ID].type) {
          typeCell.classList.add("changedData");
        } else {
          typeCell.classList.remove("changedData");
        }
      } // end if (relation ID appears in existing relations)
    } // end if (cell is not in template or insert rows)
  } // end dragDrop.dropData function
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
    else if (row.children[2].classList.contains("changedData")) { // If the node ID has been changed
      this.replaceNode(row, rows);
    }
    else if (row.children[5].classList.contains("changedData")) { // If the comment has been changed
      this.modifyNode(row, rows);
    }
    else { // If the row doesn't need any processing, just move on
      this.processNext(null, rows);
    }
  }
  else { // when all rows are processed
    // Once the DB has updated, refresh the widget
    this.db.setQuery( // set query based on relationType
      (r => {switch (r) {
      case "start": return `match (n)-[r]->(a)  where id(n)=${this.nodeID} return r, a`; break;
      case "end":   return `match  (a)-[r]->(n) where id(n)=${this.nodeID} return r, a`; break;
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
  let attributes = "";

  if (nodeIDcell.textContent != "") {
    otherNodeID = nodeIDcell.textContent;
  }
  // If no other node was specified, make a placeholder relationship with the original node, and give it a direction to mark it as a placeholder and show which way it goes
  else {
    otherNodeID = this.nodeID;
    attributes = `direction:'${this.relationType}', `;
  }

  // The exact query will depend on whether this widget is for incoming, outgoing or directionless relations. Incoming and outgoing are easy, and I can write them now.
  // Cypher doesn't actually use directionless relations, so I need to ask Uncle Dvaid how he plans to model them before writing code to deal with them.
  const queryStart =     (r => {switch (r) {
      case "start": return `match (a), (b) where ID(a) = ${this.nodeID} and id(b) = ${otherNodeID} create (a)-[r:Link`; break;
      case "end":   return `match (a), (b) where ID(a) = ${otherNodeID} and id(b) = ${this.nodeID} create (a)-[r:Link`; break;
      case "peer":  return "";  break;// not finished
      default: alert("error"); // better error handling
    }}) (this.relationType);

  const queryEnd = `]->(b) return r`;

  for (let i = 5; i < headers.length-1; i++) {
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

replaceNode (row, rows) {
  // Apparently can't change the start or end node of a relationship. Have to delete and remake instead.
  // I'll change the row from changed to new, put it BACK in the array, and delete the relationship from the DB.
  // Then when it gets processed by processNext the second time, the relationship will get added.
  row.classList.remove("changedData");
  row.classList.add("newData");
  rows.push(row);
  this.deleteNode(row, rows);
}

modifyNode (row, rows) {
  const cells = row.children;
  const idCell = cells[1];
  const id = idCell.textContent;
  const commentCell = cells[5];
  const comment = commentCell.textContent;
  this.db.setQuery(`match ()-[r]-() where ID(r) = ${id} set r.comment = '${comment}'`);
  this.db.runQuery(this, "processNext", rows);
}

//////////////////////////////////////////////////// below not reviewed

toggle(button){ // Shows or hides relations
  if (button.value ==="+") {
    button.value = ".";
    let sibling = button.nextElementSibling;
    while (sibling) {
      sibling.hidden = false;
      sibling = sibling.nextElementSibling;
    }
  } else {
    button.value = "+";
    let sibling = button.nextElementSibling;
    while (sibling) {
      sibling.hidden = true;
      sibling = sibling.nextElementSibling;
    }
  }
}


complete(data) { // Builds html for a table. Each row is a single relation and shows the number, the id, the end and the type of that relation.
  let html       = `<thead><tr idr='template'> <th>#</th> <th>R#</th> <th ondragover="app.widget('allowDrop', this, event)" ondrop ="app.widget('dropData', this, event)">N#</th>
                    <th ondragover="app.widget('allowDrop', this, event)" ondrop ="app.widget('dropData', this, event)">Name</th>
                    <th>Type</th><th editable>Comment</th> </tr></thead><tbody idr='container'>`;
  this.idrRow     = 0;
  this.idrContent = 0;
  this.existingRelations = {};
  while (this.idrRow<data.length) { // add data
    const rel= data[this.idrRow].r;
    const node = data[this.idrRow].a;
    let nodeID;
    let name = node.properties.name;
    let type = node.labels[0];
    let comment = "";

    switch (this.relationType) {
      case "start":
        nodeID = rel.end.low;
        break;
      case "end":
        nodeID = rel.start.low;
        break;
      case "peer":
        break; // not finished
      default:
        alert ("Error");
    }

    // If this node is a placeholder going the wrong way, just move along.
    if ("direction" in rel.properties && rel.properties.direction !== this.relationType) {
      this.idrRow++;
    }
    // If it's a placeholder going the right way or a real relation, add it to the table...
    else {
      if ("direction" in rel.properties) { // but if it's a placeholder, don't show the node ID, name or type.
        nodeID = "";
        name = "";
        type = "";
      }

      if ("comment" in rel.properties) { // It's now possible to have a blank comment, so allow for that
        comment = rel.properties.comment;
      }
      this.existingRelations[rel.identity] = {'comment':comment, 'nodeID':nodeID, 'name':name, 'type':type};

      const trDrag   = `<tr idr="item${this.idrRow}" ondrop="app.widget('drop', this, event)" ondragover="app.widget('allowDrop', this, event)" draggable="true" ondragstart="app.widget('drag', this, event)">`

      html += trDrag + `<td>${this.idrRow + 1}</td> <td>${rel.identity}</td>
                        <td ondragover="app.widget('allowDrop', this, event)" ondrop ="app.widget('dropData', this, event)">${nodeID}</td>
                        <td ondragover="app.widget('allowDrop', this, event)" ondrop ="app.widget('dropData', this, event)">${name}</td>
                        <td>${type}</td>
                        <td ondblclick="app.widget('edit', this, event)" idr="content${this.idrContent++}">${comment}</td>
                        <td><button idr="delete${this.idrRow++}" onclick="app.widget('markForDeletion', this)">Delete</button></td></tr>`;
    }
  }
  return html + "</tbody>";
}


//NOTE: I'm pretty sure everything below this line is never used in this class. It seems to be copied from widgetNode.

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
