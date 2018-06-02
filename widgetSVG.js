class widgetSVG {
  constructor (callerID, id, name) { // create variables, query for data if needed, then call buildWidget()
    this.widgetID = app.idCounter;
    this.mapID = id;
    this.SVG_DOM = null;
    this.widgetDOM = null;
    this.name = name;
    app.widgets[app.idCounter] = this;
    this.containedWidgets = [];
    this.callerID = callerID;
    this.keys = new mindmapKeypress(this);

    // constants for drawing
    this.width = 1200; // Width of the SVG element
    this.height = 600; // Height of the SVG element

    // variables for dragging map and selecting nodes
    this.currentX=0;
    this.currentY=0;
    this.selectedNode = null;

    // used for editing notes
    this.notesText = null;
    this.notesLabel = null;

    if (this.mapID) {
      // DBREPLACE DB function: changeNode
      // JSON object: {name:"mindmap"; id:this.mapID}
      const query = `match (mindmap:mindmap) where ID(mindmap) = ${this.mapID} return mindmap.roots as roots, mindmap.count as count, mindmap.name as name`;
      app.db.setQuery(query);
      app.db.runQuery(this, 'buildWidget');
    }

    else {
      this.buildWidget();
    }
  } // end constructor

  buildWidget(data) { // create blank mind map, then if data was passed in, call loadComplete
    if (!this.name) {
      this.name = "Untitled mind map";  // The name starts off untitled; it can change later
    }

    const html = app.widgetHeader() +
      `<b idr="name">${this.name}</b>
      <input type="button" idr="save" value="Save" onclick="app.widget('save', this)">
      <input type="button" idr="saveAs" value="Save As" onclick="app.widget('save', this)">
      <input type="button" idr="details" value="Show Details" onclick="app.widget('toggleWidgetDetails', this)">
    </div>
    <div><table><tr idr="svgRow"><td>
      <svg id="svg${this.widgetID}" width="${this.width}" height="${this.height}" viewBox = "0 0 ${this.width} ${this.height}"
        ondblclick="app.widget('newBox', this, event)"
        ondragover="app.widget('allowDrop', this, event)"
        ondrop="app.widget('dropAdd', this, event)"
        oncontextmenu="event.preventDefault()"
        onmousedown="app.widget('dragStart', this, event)"
    </svg></td></tr></table></div></div>`;

    const parent = document.getElementById('widgets');
    const caller = document.getElementById(this.callerID);
    const newWidget = document.createElement('div'); // create placeholder div
    parent.insertBefore(newWidget, caller); // Insert the new div before the first existing one
    newWidget.outerHTML = html; // replace placeholder with the div that was just written
    this.SVG_DOM = document.getElementById(`svg${this.widgetID}`);
    this.widgetDOM = document.getElementById(`${this.widgetID}`);

    this.notesText = document.createElement("textarea");
    this.notesText.setAttribute("hidden", "true");
    this.notesText.setAttribute("idr", "notes");
    this.notesText.setAttribute("oncontextmenu", "event.preventDefault()");
    this.SVG_DOM.appendChild(this.notesText);

    this.d3Functions = new d3Functions(this);
    this.clicks = new mindmapClick(this, this.SVG_DOM, this.d3Functions);

    if (data) {
      this.loadComplete(data);
    }

    if (app.activeWidget) {
      app.activeWidget.classList.remove("activeWidget");
    }
    app.activeWidget = this.widgetDOM;
    this.widgetDOM.classList.add("activeWidget");
  } // end buildWidget

  loadComplete(data) { // Sets the roots array for the mind map to match the data that was loaded, then calls update() to draw the mind map
    if (data.length == 0) {
      alert ("Error: Mind map not found");
    }
    else if (data.length > 1) {
      alert ("Error: Multiple mind maps found with same name");
    }
    else { // If one result was returned - which should always happen
      if (data[0].roots) {
        this.d3Functions.roots = JSON.parse(data[0].roots);

        // Go through all objects, make them reference d3Functions, add to objects array
        let nonRootObjs = [];
        for (let i = 0; i < this.d3Functions.roots.length; i++) { // for every root...
          const root = this.d3Functions.roots[i];
          root.instance = this.d3Functions;
          for (let j = 0; j < root.details.length; j++) {
            root.details[j].instance = this.d3Functions;
          }

          if (root.children) {
            nonRootObjs = nonRootObjs.concat(root.children);
          }
          else if (root._children) {
            nonRootObjs = nonRootObjs.concat(root._children);
          }
          this.d3Functions.objects[root.id] = {};
          this.d3Functions.objects[root.id].JSobj = root; // Store JS object
          this.d3Functions.objects[root.id].DOMelements = {}; // Prepare to store DOM elements

        }

        while (nonRootObjs.length > 0) { // If there are more objects...
          const label = nonRootObjs.pop();
          label.instance = this.d3Functions;
          for (let j = 0; j < label.details.length; j++) {
            label.details[j].instance = this.d3Functions;
          }

          if (label.children) {
            nonRootObjs = nonRootObjs.concat(label.children);
          }
          else if (label._children) {
            nonRootObjs = nonRootObjs.concat(label._children);
          }

          this.d3Functions.objects[label.id] = {};
          this.d3Functions.objects[label.id].JSobj = label; // Store JS object
          this.d3Functions.objects[label.id].DOMelements = {}; // Prepare to store DOM elements
        }
      }

      if (data[0].count) {
        this.d3Functions.count = data[0].count;
      }
      if (data[0].name) {
        this.name = data[0].name;
        const nameText = app.domFunctions.getChildByIdr(this.widgetDOM, 'name');
        nameText.textContent = this.name;
      }
      this.d3Functions.update();
    }
  }

  toggleWidgetDetails(button) {
    const row = app.domFunctions.getChildByIdr(this.widgetDOM, 'svgRow');
    if (button.value == "Show Details") {
      const detailsCell = row.insertCell(-1);
      this.containedWidgets.push(app.idCounter);
      new widgetDetails('mindmap', detailsCell, this.mapID);
      button.value = "Hide Details";

    }
    else {
      row.deleteCell(-1);
      button.value = "Show Details";
    }
  }

  allowDrop(object, evnt) { // Prevent default action so drag and drop works properly. Also find parent and sibling nodes.
    evnt.preventDefault();
    this.clicks.highlightParent(evnt.clientX, evnt.clientY, null);
  }

  dropAdd (svg, evnt) { // Add node to the list of root nodes in the mind map and call update.
    let data = {};
    if (evnt.dataTransfer.getData("text/uri-list")) { // If the object being dragged is a link
      data.name = evnt.dataTransfer.getData("text/uri-list");
      data.nodeID = null;
      data.type = "link";
      const uri = {};
      uri.field = "uri";
      uri.value = evnt.dataTransfer.getData("text/uri-list");
      data.details = [];
      data.details.push(uri);
    }

    else { // If it's not a link, check whether it's a node...
      const dataText = evnt.dataTransfer.getData("text/plain");
      if (dataText) {
        data = JSON.parse(dataText);
      }
      // If the object being dragged is not a node
      if (!data || data.sourceType != "widgetTableNodes" || data.sourceTag != "TD") {
        return;
      }
    }

    const name = data.name;

    const x = evnt.clientX;
    const y = evnt.clientY;
    const bound = svg.getBoundingClientRect();
    const top = bound.top;
    const left = bound.left;
    const viewBox = svg.getAttribute("viewBox").split(" ");
    const relX = x - left + parseInt(viewBox[0]);
    const relY = y - top + parseInt(viewBox[1]);

    const newObj = this.d3Functions.newObj();
    newObj.x = relX;
    newObj.y = relY;
    newObj.nodeID = data.nodeID;
    newObj.name = name;
    newObj.type = data.type;
    newObj.details = data.details;
    this.d3Functions.editNode = null; // NOTE: Fix this; we shouldn't be assigning a variable just to unassign it later

    // Trying to get reference to this object into the data, where anonymous functions can use it
    newObj.instance = this.d3Functions;
    for (let i = 0; i < newObj.details.length; i++) {
      newObj.details[i].instance = this.d3Functions;
    }

    let group = null;

    //  Check whether user dropped ONTO a nodeRect.
    // If so, instead of adding the new node as a root, call connectNode.
    const rects = this.clicks.checkClickedNode(null, x, y);
    if (rects) {
      for (let i = 0; i < rects.length; i++) {
        if (rects[i].classList.contains("nodeRect")) {
          group = rects[i].parentElement;
        }
      }
    }

    if (group) {
      this.connectNode(group, newObj);
      this.d3Functions.update();
    }

    // now check if user dropped NEAR a label. This can be determined by checking parentNode in clicks.
    // If so, add the new node as a child of that label.
    else if (this.clicks.parentNode) {
      this.clicks.dropConnect(this.clicks.parentNode, newObj);
    }

    // If it wasn't dropped on or near a label, add it as a root.
    else {
      this.d3Functions.roots.push(newObj);
      this.d3Functions.update();
    }

    // Make this the active widget
    if (app.activeWidget) {
      app.activeWidget.classList.remove("activeWidget");
    }
    app.activeWidget = this.widgetDOM;
    this.widgetDOM.classList.add("activeWidget");
  }

  connectNode(group, newObj) { // Connect a node to a label
    const id = group.getAttribute("idr").slice(5);
    const labelObj = this.d3Functions.objects[ID].JSobj;

    labelObj.name = newObj.name;
    labelObj.nodeID = newObj.nodeID;
    labelObj.type = newObj.type;
    labelObj.details = newObj.details;
    this.makeSelectedNode(group);
  }

  newBox(element, evnt) {
    // Get positioning information
    const x = evnt.clientX;
    const y = evnt.clientY;
    const bound = this.SVG_DOM.getBoundingClientRect();
    const top = bound.top;
    const left = bound.left;
    const viewBox = this.SVG_DOM.getAttribute("viewBox").split(" ");
    const relX = x - left + parseInt(viewBox[0]);
    const relY = y - top + parseInt(viewBox[1]);

    // verify that the user doubleclicked on an EMPTY spot
    const elements = this.clicks.checkClickedNode(null, x, y);
    if (elements == null) {
      const newObj = this.d3Functions.newObj();
      newObj.x = relX;
      newObj.y = relY;
      this.d3Functions.roots.push(newObj);
      this.d3Functions.update();
    }
  }

  keyPressed(evnt) {
    this.keys.keyPressed(evnt);
  }

  click(rectangle, evnt, methodName) {
    this.clicks[methodName](rectangle, evnt);
  }

  dragStart(SVG, evnt) {
    // Verify empty spot
    const elements = this.clicks.checkClickedNode(null, evnt.clientX, evnt.clientY);
    if (elements == null) {
      this.currentX = evnt.clientX; // get mouse position
      this.currentY = evnt.clientY;
      SVG.setAttribute("onmousemove", "app.widget('drag', this, event)");
      SVG.setAttribute("onmouseup", "this.removeAttribute('onmousemove'); this.removeAttribute('onmouseup')");
    }

    else { // If at least one rectangle was clicked in, check each clicked rectangle for a mousedownObj.
      for (let i = 0; i < elements.length; i++) {
        const obj = JSON.parse(elements[i].getAttribute("mousedownObj"));
        if (obj) { // If this rectangle has a mousedown object...
          if (obj.subclass) {
            this[obj.subclass][obj.method](elements[i], evnt, obj.args);
          }
          else {
            this[obj.method](elements[i], evnt, obj.args);
          }
          // If at least one rectangle was clicked in, and had a mousedown event
          // (so we're doing something other than scrolling),
          // check for mouseup events when the mouse is released.
          SVG.setAttribute("onmouseup", "app.widget('mouseup', this, event)");
        }
      }
    }
  }

  drag(SVG, evnt) {
    const dx = evnt.clientX - this.currentX;
    const dy = evnt.clientY - this.currentY;
    this.currentX = evnt.clientX;
    this.currentY = evnt.clientY;
    let viewBox = SVG.getAttribute("viewBox").split(" ");
    viewBox[0] = parseInt(viewBox[0]) - dx;
    viewBox[1] = parseInt(viewBox[1]) - dy;
    SVG.setAttribute("viewBox", `${viewBox[0]} ${viewBox[1]} ${this.width} ${this.height}`)
  }

  mouseup(SVG, evnt) {
    const elements = this.clicks.checkClickedNode(null, evnt.clientX, evnt.clientY);
    if (elements) { // If at least one rectangle was clicked in, check each clicked rectangle for a mouseupObj.
      for (let i = 0; i < elements.length; i++) {
        const obj = JSON.parse(elements[i].getAttribute("mouseupObj"));
        if (obj) { // If this rectangle has a mouseup object...
          if (obj.subclass) {
            this[obj.subclass][obj.method](elements[i], evnt, obj.args);
          }
          else {
            this[obj.method](elements[i], evnt, obj.args);
          }
        }
      }
    }
  }

  // REFACTOR THIS LATER - there's no point right now, the whole thing needs to be overhauled.
  save (button) { // Saves the current state of the graph to the database.
    let name = this.name;
    const id = this.mapID;
    if (name == "Untitled mind map" || !id || button.getAttribute("idr") == "saveAs") {  // If the mind map doesn't have a name or doesn't have an ID (indicating that it hasn't been saved),
                                                                        // or if the user clicked the "Save As" button, indicating they want to change the name, ask for a name.
      name = prompt("Please enter the name for this mind map", name);
    }

    // Create array of parents (starts empty)
    const parents = [];

    // Copy roots array (with pointers to original root objects)
    const rootsCopy = Array.from(this.d3Functions.roots);

    // For each root object, copy the object, remove the instance, replace the original with the copy, add to parents if applicable
    for (let i = 0; i < rootsCopy.length; i++) {
      const copy = Object.assign({}, rootsCopy[i]);
      delete copy.instance;

      // Copy and delete instances from the details array too
      const detailCopy = Array.from(copy.details)
      for (let j = 0; j < detailCopy.length; j++) {
        const lineCopy = Object.assign({}, detailCopy[j]);
        delete lineCopy.instance;
        detailCopy[j] = lineCopy;
      }
      copy.details = detailCopy;
      rootsCopy[i] = copy;

      if (copy.children && copy.children.length > 0 || copy._children && copy._children.length > 0) {
        parents.push(copy);
      }
    }
    // For each item in parents, go through children array
    while (parents.length > 0) {
      const obj = parents.pop();
      let kids = null;
      if (obj.children) {  // Get the children array, whether hidden or not
        kids = Array.from(obj.children);
        obj.children = kids;
      }
      else  {
        kids = Array.from(obj._children);
        obj._children = kids;
      }

      // For each child, copy the object, remove instance, replace, add to parents if applicable
      for (let i = 0; i < kids.length; i++) {
        const copy = Object.assign({}, kids[i]);
        delete copy.instance;

        // Copy and delete instances from the details array too
        const detailCopy = Array.from(copy.details)
        for (let j = 0; j < detailCopy.length; j++) {
          const lineCopy = Object.assign({}, detailCopy[j]);
          delete lineCopy.instance;
          detailCopy[j] = lineCopy;
        }
        copy.details = detailCopy;
        kids[i] = copy;

        if (copy.children && copy.children.length > 0 || copy._children && copy._children.length > 0) {
          parents.push(copy);
        }
      }
    }

    // I REALLY REALLY hope that when we get here, rootsCopy is a copy of roots with no instances, which can be stringified.

    for (let i=0; i< rootsCopy.length; i++) { // Go through all the roots and add their transform values to their coordinates, so they'll display in the right places.
        const root = rootsCopy[i];
        const id = root.id;
        const tree = this.d3Functions.objects[id].DOMelements.tree;
        const transform = tree.getAttribute("transform").slice(10, -1).split(' '); // Get the transformation string and extract the coordinates
        root.x = parseFloat(transform[0]);
        root.y = parseFloat(transform[1]);
    }

    // DBREPLACE DB function: createNode
    // JSON object: {name:"mindmap"; type:"mindmap"; details:{name:name}; merge:true; changes:{roots:app.stringEscape(JSON.stringify(rootsCopy)); count:this.count}}
    const query = `merge (mindmap: mindmap {name:"${name}"}) with mindmap set mindmap.roots="${app.stringEscape(JSON.stringify(rootsCopy))}", mindmap.count = ${this.d3Functions.count}`;

    app.db.setQuery(query);
    app.db.runQuery();
  }

  lookForEnter(input, evnt) { // Makes hitting enter do the same thing as blurring (e. g. inserting a new node or changing an existing one)
    if (evnt.keyCode === 13) {
      input.onblur();
    }
  }

  saveInput(edit) {
    if (this.d3Functions.editNode) { // This SHOULD only run when there's a node being edited, but it doesn't hurt to check
      const editObj = this.d3Functions.objects[this.d3Functions.editNode].JSobj;
      editObj.name = edit.value;
      this.d3Functions.editNode = null;
    }
    // Even if there is no new object, hide and move the edit text box and refresh
    edit.hidden = true;
    edit.value = "";
    edit.setAttribute("style", "position:static");
    this.SVG_DOM.appendChild(edit);
    this.d3Functions.update();
  }

  toggleChildren(button, evnt) { // Toggle children.
    evnt.stopPropagation();
    const group = button.parentElement;
    const d = group.__data__;

    // swap children and _children
    const temp = d.data.children;
    d.data.children = d.data._children;
    d.data._children = temp;

    this.makeSelectedNode(group);
    this.d3Functions.update();
  }

  toggleDetails(button, evnt) {
    evnt.stopPropagation();
    const group = button.parentElement;
    const ID = group.getAttribute("idr").slice(5); // the IDR will be like groupxxx
    const obj = this.d3Functions.objects[ID].JSobj;
    if (obj.nodeID || obj.type == "link") {
      // Look for an existing popup for this node (there should be one).
      const popup = this.d3Functions.objects[ID].DOMelements.popupGroup;
      const tree = group.parentElement;
      if (popup.classList.contains("hidden")) { // In order to make sure this popup is on top...
        group.appendChild(popup); // Make the popup top in its node group...
        tree.appendChild(group); // and the node top in its tree...
        this.SVG_DOM.appendChild(tree); // and the tree top in the SVG.
        popup.classList.remove("hidden")
      }
      else {
        popup.classList.add("hidden");
      }
    }
    this.makeSelectedNode(group);
  }

  toggleNotes(button, evnt) {
    evnt.stopPropagation();
    const ID = button.getAttribute("idr").slice(4); // idr is like notexxx
    const obj = this.d3Functions.objects[ID].JSobj;
    if (this.notesLabel == obj) { // If this label's notes are shown already
      this.notesLabel.notes = this.notesText.value;
      this.notesLabel.notesHeight = this.notesText.clientHeight;
      this.notesLabel.notesWidth = this.notesText.clientWidth;
      this.notesLabel = null;
      this.notesText.hidden = true;
      this.notesText.value = "";
      this.notesText.setAttribute("style", "position:static");
      this.SVG_DOM.appendChild(this.notesText);
      this.d3Functions.update();
    }
    else { // If this label's notes are NOT already shown
      this.SVG_DOM.parentElement.appendChild(this.notesText);
      this.notesText.hidden = false;
      let heightString = "";
      let widthString = "";

      // Get the object data
      if (obj.notes) {
        this.notesText.value = obj.notes;
      }

      if (obj.notesHeight) { // If it has a notesHeight, it will also have a notesWidth
        heightString = ` height:${obj.notesHeight}px;`;
        widthString = ` width:${obj.notesWidth}px;`;
      }

      // Get the rectangle's location
      const rect = this.d3Functions.objects[ID].DOMelements.node;
      const bounds = rect.getBoundingClientRect();
      let leftPos = bounds.left + window.scrollX + this.d3Functions.nodeWidth;
      let topPos = bounds.top + window.scrollY;

      // Make the notes text area visible
      this.notesText.setAttribute("style", `position:absolute; left:${leftPos}px; top:${topPos}px;${heightString}${widthString}`);

      this.notesLabel = obj;
      this.notesText.select();

      this.makeSelectedNode(rect.parentElement);
    } // end else (notes are not shown; show them)
  }

  // Show or hide explanations for inactive buttons
  toggleExplain(button, evnt, prefix) {
    const group = button.parentElement;
    const tree = group.parentElement;
    const ID = group.getAttribute("idr").slice(5); // the IDR will be like groupxxx
    const text = this.d3Functions.objects[ID].DOMelements[`${prefix}Expln`];
    const box = this.d3Functions.objects[ID].DOMelements[`${prefix}ExpBox`];

    if (evnt.type == "mouseover") { // SHOW the explanation, if applicable
        this.SVG_DOM.appendChild(tree);
        tree.appendChild(group);
        group.appendChild(box);
        group.appendChild(text);

        text.classList.remove("hidden"); // Then show it
        box.classList.remove("hidden");
      // }
    }

    else { // HIDE the explanation
      text.classList.add("hidden");
      box.classList.add("hidden");
    }
  }

  // If the label has a link attached, opens that link in a new tab.
  // If it has a mindmap or calendar attached, opens the mindmap or calendar.
  // If it has any other type of node attached, opens a widgetNode table showing that node's details.
  showNode(button, evnt) {
    evnt.stopPropagation();
    const data = button.parentElement.parentElement.__data__.data;
    const id = data.nodeID;
    const type = data.type;

    switch(type) {
      case 'mindmap':
        new widgetSVG(this.widgetID, id);
        break;
      case 'calendar':
        new widgetCalendar(this.widgetID, id);
        //setTimeout(this.showCalendar, 1, this.widgetID, id); // Temporary workaround because calendars don't make DB requests, which is what slows down the other node types
        break;
      case 'link':
        window.open(data.details[0].value); // For now, assume the uri is the first (and only) detail
        break;
      default:
        new widgetNode(this.widgetID, type, id);
    }
  }

  showCalendar(widgetID, id) {
    new widgetCalendar(widgetID, id);
  }

  disassociate(button, evnt) {
    evnt.stopPropagation();
    // Get object
    const ID = button.getAttribute("idr").slice(12); // This IDR will be like "disassociatexxx"
    const obj = this.d3Functions.objects[ID].JSobj;
    // reset node ID, type and details
    obj.nodeID = null;
    obj.type = "";
    obj.details = [];

    // Close detail popup
    const popup = this.d3Functions.objects[ID].DOMelements.popupGroup;
    popup.classList.add("hidden");

    // Check whether to hide buttons
    this.checkHideButtons(button.parentElement, evnt);

    this.d3Functions.update();
  }

  makeSelectedNode(group) {
    if (this.selectedNode && this.selectedNode != group) {
      const id = this.selectedNode.getAttribute("idr").slice(5); // groupxxx
      this.hideEverything(id);
      this.selectedNode.classList.remove("selected");
    }
    this.selectedNode = group;
    this.selectedNode.classList.add("selected");
  }

  // Make the buttons (and their text) visible when the main rect is moused over
  showButtons(rect) {
    const group = rect.parentElement;
    const ID = group.getAttribute("idr").slice(5); // the IDR will be like groupxxx

    const prefixes = ["toggle", "toggleText1",
                      "note", "showNotesText1",
                      "detail", "showDetailsText1",
                      "edit", "editText1"];
    for (let i = 0; i < prefixes.length; i++) {
      const idr = prefixes[i] + ID;
      const element = this.d3Functions.objects[ID].DOMelements[prefixes[i]];
      group.appendChild(element);
      element.classList.remove("hidden");
    }
  }

  // Hide the buttons if:
    // The mouse isn't over the main rect
    // The mouse isn't over any of the buttons
    // The details popup isn't visible
    // The notes panel isn't visible
  checkHideButtons(element, evnt) { // element is an element in the group - the main rectangle or one of the buttons, usually
    const x = evnt.clientX;
    const y = evnt.clientY;
    let inAnything = false;

    const group = element.parentElement;
    const ID = group.getAttribute("idr").slice(5); // the IDR will be like groupxxx

    const prefixes = ["node", "toggle", "note", "detail", "edit"];
    for (let i = 0; i < prefixes.length; i++) {
      const idr = prefixes[i] + ID;
      const element = this.d3Functions.objects[ID].DOMelements[prefixes[i]];
      const bound = element.getBoundingClientRect();
      const inElement = bound.left <= x && x <= bound.right && bound.top <= y && y <= bound.bottom;
      if (inElement) {
        inAnything = true;
        break;
      }
    }

    const detailPopup = this.d3Functions.objects[ID].DOMelements.popupGroup;
    const popupOpen = !(detailPopup.classList.contains("hidden"));

    const obj = this.d3Functions.objects[ID].JSobj;
    const editing = this.notesLabel == obj;

    if (!(inAnything || popupOpen || editing)) {
      this.hideEverything(ID);
    }
  }

  hideEverything(ID) {
    const prefixes = ["toggle", "toggleText1", "toggleExpln", "toggleExpBox",
                      "note", "showNotesText1", "noteExpln", "noteExpBox",
                      "detail", "detailExpln", "showDetailsText1", "detailExpBox",
                      "edit", "editText1", "editExpln", "editExpBox",
                      "popupGroup"];

    for (let i = 0; i < prefixes.length; i++) {
      const idr = prefixes[i] + ID;
      const element = this.d3Functions.objects[ID].DOMelements[prefixes[i]];
      element.classList.add("hidden");
    }

    const obj = this.d3Functions.objects[ID].JSobj;
    const editing = this.notesLabel == obj;

    if(editing) {
      const note = this.d3Functions.objects[ID].DOMelements.note;
      this.toggleNotes(note);
    }
  }
}
