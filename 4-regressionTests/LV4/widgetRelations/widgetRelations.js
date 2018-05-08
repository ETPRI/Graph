/*

add/edit relations for a node

input: node
      relation - start | end | peer
      userNodeID - where relation order is stored
*/


class widgetRelations {
constructor(containerDOM, nodeID, viewID, relationType, object, objectMethod) {
  // data to be displayed
  this.containerDOM = containerDOM  // place to set innerHTML
  this.nodeID       = nodeID;       // neo4j node id where relationship starts
  this.viewID       = viewID;       // Will write code that uses this later
  this.id           = app.idCounter; // ID of the widget to be created
  this.relationType = relationType;
  this.existingRelations = {};
  this.object = object;
  this.objectMethod = objectMethod;

  this.idrContent   = 0;            // Number of existing editable cells added to table
  this.idrRow       = 0;            // Number of existing rows added to the table
  this.order = [];                  // Order of relations set by the current user

  app.widgets[app.idCounter++] = this;
  this.containedWidgets = [];

  // DOM pointers to data that will change, just make place holders
  // this.widgetDOM   = {};

  this.db          = new db() ;
  this.refresh()
}


refresh() { // Refresh the widget
  const query = `match (per)-[:Owner]->(view:View {direction:"${this.relationType}"})-[:Subject]->(node)
                 where ID(per) = ${this.viewID} and ID(node) = ${this.nodeID}
                 match (view)-[r:Link]->(a) return r, a, view.order as ordering order by r.comment, a.name, a.labels[0]`;
  this.db.setQuery(query);
  this.db.runQuery(this,"rComplete");
}

rComplete(data) {
  this.containerDOM.setAttribute("id", this.id.toString());
  this.containerDOM.setAttribute("class", "widget");

  let buttonValue = "Sync";
  if (app.login.userID && app.login.userID == this.viewID) {
    buttonValue = "Save";
  }
  // Create table for existing data
  this.containerDOM.innerHTML = `<input idr = "SaveSync" type="Button" value=${buttonValue} onclick="app.widget('saveSync', this)">
                                 <table>${this.complete(data)}</table>`;

  if (app.login.userID && app.login.userID == this.viewID) { // Add a dragdrop table if this view belongs to the user who is logged in
    setTimeout(this.createDragDrop, 1, this);
  }
}


createDragDrop(widgetRel) {
  widgetRel.containedWidgets.push(app.idCounter);
	const dragDrop = new dragDropTable("template", "container", widgetRel.containerDOM, widgetRel.idrRow, widgetRel.idrContent);
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
    let row = input;
    let idr = row.getAttribute("idr");

    const dataText = evnt.dataTransfer.getData("text/plain");
    const data = JSON.parse(dataText);

    // If the source is a cell from this dragDrop table, we are rearranging. Call drop instead.
    if (data.sourceType == "dragDrop" && data.sourceTag == "TR" && data.sourceID == this.id) {
            this.drop(input, evnt);
    }

    // If the source is a cell from a widgetTableNodes, we are either adding a new entry or changing an entry's node.
    // If the source is another table of relations, we are definitely adding a new entry.
    else if (data.sourceType == "widgetTableNodes" && data.sourceTag == "TD" ||
             data.sourceType == "widgetRelations" && data.sourceTag == "TR" ||
             data.sourceType == "dragDrop" && data.sourceTag == "TR" && data.sourceID != this.id) {

      if (idr != "template") { // Verify that the cell is not in the template row...

        // If a node was dragged from a node table to the insert row, or a whole relation was dragged from another table to ANY row, create a new row and add to that.
        if (idr == "insertContainer" || data.sourceType == "widgetRelations" || data.sourceType == "dragDrop") {
          row = this.insert(null, row);
          idr = row.getAttribute("idr");
        }

        const nodeIDcell = row.children[2];
        nodeIDcell.textContent = data.nodeID;
        const nameCell = row.children[3];
        nameCell.textContent = data.name;
        const typeCell = row.children[4];
        typeCell.textContent = data.type;

        // add changedData class if necessary
        const IDcell = row.children[1];
        const ID = IDcell.textContent;
        if (ID in this.existingRelations) { // If this node was already in the database, check whether the node that was just added differs from the recorded one. Mark the cell as changed or not accordingly
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

        //log
        const obj = {};
        obj.id = app.domFunctions.widgetGetId(input);
        obj.idr = input.getAttribute("idr");
        obj.action = "drop";
        app.regression.log(JSON.stringify(obj));
        app.regression.record(obj);
      } // end if (cell is not in template row)
    } // end else if (the source was a widgetTableNodes cell
  } // end dragDrop.dropData function

  dragDrop.drag = function(input, evnt){ // Expand drag function to store data as well as mark an active node
    this.activeNode = evnt.target;
    const IDcell = this.activeNode.children[2];
    const ID = IDcell.textContent;
    const nameCell = this.activeNode.children[3];
    const name = nameCell.textContent;
    const typeCell = this.activeNode.children[4];
    const type = typeCell.textContent;
    const commentCell = this.activeNode.children[5];
    const comment = commentCell.textContent;

    const data = {};
    data.nodeID = ID;
    data.name = name;
    data.type = type;
    data.comment = comment;
    data.sourceID = app.domFunctions.widgetGetId(input);
    data.sourceType = "dragDrop";
    data.sourceTag = input.tagName;
    evnt.dataTransfer.setData("text/plain", JSON.stringify(data));

    const obj = {};
    obj.id = this.domFunctions.widgetGetId(evnt.target);
    obj.idr = event.target.getAttribute("idr");
    obj.action = "dragstart";
    this.log(JSON.stringify(obj));
    app.regression.log(JSON.stringify(obj));
    app.regression.record(obj);
  } // end dragDrop.drag function
}

saveSync(button) {
  // Log first to make sure the click is logged BEFORE any data
  const obj = {};
  obj.id = app.domFunctions.widgetGetId(button);
  obj.idr = button.getAttribute("idr");
  obj.action = "click";
  app.regression.log(JSON.stringify(obj));
  app.regression.record(obj);

  // If this is the user's view, save all changed data, then refresh. If it's anyone else's, just refresh.
  if (app.login.userID && app.login.userID == this.viewID) {
    const widgetID = app.domFunctions.widgetGetId(button);
    const relWidget = document.getElementById(widgetID); // Returns the relations widget
    const tableWidget = relWidget.getElementsByClassName("widget")[0]; // The only subwidget inside the relations widget should be the table
    const container = app.domFunctions.getChildByIdr(tableWidget, "container");
    const rows = Array.from(container.children);

    this.processNext(null, rows);
  }
  else {
    this.refresh();
  }
}

processNext(data, rows) {
  // The only processing function that returns data is addNode, which returns ID(r). Check for existence of data[0] to distinguish from an empty array, which deletion returns
  // If processNext gets data, it is the ID from an addNode call. Extract the ID and add it to the order array.
  if (data && data[0]) {
    // example of data from addNode: [{"ID(r)":{"low":3,"high":0}}]
    const id = data[0]["ID(r)"].low;
    this.order.push(id.toString());
  }

  if (rows.length >0) {
    const row = rows.pop();
    if (row.classList.contains("deletedData")) { // If the relation has been marked for deletion, delete it. No need to add to order array.
      this.deleteNode(row, rows);
    }
    else if (row.classList.contains("newData")) { // If the relation is new, add it. Can't add to order array yet - that will be done once a relation ID is assigned.
      this.addNode(row, rows);
    }
    else if (row.children[2].classList.contains("changedData")) { // If the node ID has been changed, replace the relation. ID will be added to array after the new relation ID is assigned.
      this.replaceNode(row, rows);
    }
    else if (row.children[5].classList.contains("changedData")) { // If the comment has been changed, modify the relation. Go ahead and add ID now - it won't change.
      const cells = row.children;
      const idCell = cells[1];
      const id = idCell.textContent;
      this.order.push(id);
      this.modifyNode(row, rows);
    }
    else { // If the row doesn't need any processing, just add its ID to order and move on
      const cells = row.children;
      const idCell = cells[1];
      const id = idCell.textContent;
      if (id) { // Don't push ID if it doesn't exist (that will happen when the insert row is processed)
        this.order.push(id);
      }
      this.processNext(null, rows);
    }
  }
  else { // when all rows are processed
    this.order.reverse();

    // Update the view's order property
    const query = `match (user)-[:Owner]->(view:View {direction:"${this.relationType}"})-[:Subject]->(node)
                   where ID(user) = ${this.viewID} and ID(node) = ${this.nodeID}
                   set view.order = ${JSON.stringify(this.order)}`;
    this.db.setQuery(query);
    this.db.runQuery(this,'refresh');

    this.order = []; // Finally, reset this.order.
  }
}

deleteNode(row, rows) {
  const cells = row.children;
  const idCell = cells[1];
  const id = idCell.textContent;
  let otherRelType;
  switch (this.relationType) {
    case "start": otherRelType = "end"; break;
    case "end":   otherRelType = "start"; break;
    case "peer":  otherRelType = "peer"; break;
  }

  // delete the relation going to the other node in the view of this node, find the user's view of the other node, and delete the relation from that view to this node.
  this.db.setQuery(`match ()-[r]-(node) where ID(r) = ${id} delete r with node
                    match (user)-[:Owner]->(view:View {direction:"${otherRelType}"})-[:Subject]->(node) where ID(user) = ${this.viewID}
                    match (view)-[r2:Link]->(this) where ID(this) = ${this.nodeID} delete r2`);
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
  this.db.setQuery(`match ()-[r]-() where ID(r) = ${id} set r.comment = "${app.stringEscape(comment)}"`);
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

  for (let i = 5; i < headers.length-1; i++) { // start at 5 because the first 5 columns describe the node or are auto-generated - they aren't attributes of the relation.
    const text = cells[i].textContent;
    if (text != "") {
      attributes += `${headers[i].textContent.toLowerCase()}:"${app.stringEscape(text)}", `
    }
  }

  if (attributes.length > 2) {
    attributes = attributes.substr(0, attributes.length-2); // remove the final comma and space
  }

  let startID;
  let endID;
  switch (this.relationType) {
    case "start":
      startID = this.nodeID;
      endID = otherNodeID;
      break;
    case "end":
      startID = otherNodeID;
      endID = this.nodeID;
      break;
    case "peer":
      break;
  }

  const query = `match (per), (start), (end)
               where ID(per) = ${this.viewID} and ID(start) = ${startID} and ID(end)=${endID}
               merge (per)-[:Owner]->(view:View {direction:"start"})-[:Subject]->(start)
               merge (view)-[:Link {${attributes}}]->(end)
               merge (per)-[:Owner]->(view2:View {direction:"end"})-[:Subject]->(end)
               merge (view2)-[:Link {${attributes}}]->(start)`;

  this.db.setQuery(query);
  this.db.runQuery(this, "processNext", rows);
}


//////////////////////////////////////////////////// below not reviewed

complete(nodes) { // Builds html for a table. Each row is a single relation and shows the number, the id, the end and the type of that relation.
  const logNodes = JSON.parse(JSON.stringify(nodes)); // Need a copy that WON'T have stuff deleted, in order to log it later
  app.stripIDs(logNodes); // May as well go ahead and remove the IDs now
  const ordering = []; // Stores the ordered IDs, as stored in the table
  const orderedNodes = []; // Stores ordered DATA, which is reproducible and human-readable, for testing
  if (nodes[0] && nodes[0].ordering) { // If at least one node and an ordering were returned...
    ordering = nodes[0].ordering;
  }

  let html       = `<thead><tr idr='template' ondrop="app.widget('dropData', this, event)">
                    <th>#</th> <th>R#</th> <th>N#</th> <th>Name</th> <th>Type</th> <th editable>Comment</th>
                    </tr></thead><tbody idr='container'>`;
  this.idrRow     = 0;
  this.idrContent = 0;
  this.existingRelations = {};

  for (let i = 0; i < ordering.length; i++) {
    // Find the item in nodes which matches, if any
    const relation = nodes.filter(node => node.r.identity == ordering[i]);
    if (relation[0]) { // If that relation still exists, add it to the table and delete it from the list of relations
      html = this.addLine(relation[0], html, orderedNodes);
      // Remove from array
      const index = nodes.indexOf(relation[0]);
      delete nodes[index];
    }
  }

  // logging
  const obj = {};
  obj.nodes = logNodes;
  obj.order = orderedNodes;
  app.regression.log(JSON.stringify(obj));
  app.regression.record(obj);

  if (this.object && this.objectMethod) {
    this.object[this.objectMethod]();
    this.object = null;
    this.objectMethod = null;
  }

  for (let i = 0; i < nodes.length; i++) { // add unordered data
    if (nodes[i] !== undefined) { // Some entries will be undefined because they were added as ordered data and deleted. Skip them.
      html = this.addLine(nodes[i], html);
    }
  }
  return html + "</tbody>";
}

addLine(relation, html, orderedNodes) {
  const rel = relation.r;
  const node = relation.a;
  let nodeID = node.identity;
  let name = node.properties.name;
  let type = node.labels[0];
  let comment = "";


  // NOTE: CLEAN THIS UP! Placeholders aren't directly circular anymore. Need to think about how best to handle them.
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

    // Default is that this is NOT the logged in user. The row can only be dragged, the cells can't be interacted with at all and the delete button is not needed.
    let trHTML = `<tr idr="item${this.idrRow}" draggable="true" ondragstart="app.widget('drag', this, event)">`;
    let deleteHTML = "";
    let editHTML = "";

    // If this is the logged-in user's view, they get the full functionality - ability to drag, drop and delete.
    if (app.login.userID && app.login.userID == this.viewID) {
      trHTML = `<tr idr="item${this.idrRow}" ondrop="app.widget('dropData', this, event)" ondragover="app.widget('allowDrop', this, event)" draggable="true" ondragstart="app.widget('drag', this, event)">`
      deleteHTML = `<td><button idr="delete${this.idrRow++}" onclick="app.widget('markForDeletion', this)">Delete</button></td>`;
      editHTML = `ondblclick="app.widget('edit', this, event)"`
    }


    html += trHTML + `<td>${this.idrRow}</td> <td>${rel.identity}</td>
                      <td idr="content${this.idrContent++}">${nodeID}</td>
                      <td idr="content${this.idrContent++}">${name}</td>
                      <td>${type}</td>
                      <td idr="content${this.idrContent++}" ${editHTML}>${comment}</td>
                      ${deleteHTML}</tr>`;
  }

  // If an array of ordered nodes was passed in, add this line to it
  if (orderedNodes) {
    const node = {};
    node.comment = comment;
    node.name = name;
    node.type = type;
    orderedNodes.push(node);
  }
  return html;
}

drag(line, evnt) { // This is what happens when a row from someone else's view is dragged
  const data = {};
  data.name = line.children[3].textContent;
  data.type = line.children[4].textContent;
  data.nodeID = line.children[2].textContent;
  data.comment = line.children[5].textContent;
  data.sourceID = app.domFunctions.widgetGetId(line);
  data.sourceType = "widgetRelations";
  data.sourceTag = line.tagName;
  evnt.dataTransfer.setData("text/plain", JSON.stringify(data));

  const obj = {};
  obj.id = app.domFunctions.widgetGetId(line);
  obj.idr = line.getAttribute("idr");
  obj.action = "dragstart";
  app.regression.log(JSON.stringify(obj));
  app.regression.record(obj);
}
} ///////////////////// endclass
