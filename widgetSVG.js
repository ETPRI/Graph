/* Current function count: 49
    Won't be needed permanently: 1 (showCalendar)
    For distinguishing between types of mouse clicks: 8 (selectNode through noDoubleClick)
    Other mouse functions: 5 (dragNode-moveNode, releaseNode)

    Can combine showDetails and hideDetails into one. Call it toggleWidgetDetails to distinguisn from node details
*/
class widgetSVG {
  constructor (callerID, id, name) { // create variables, then call buildWidget()
    this.widgetID = app.idCounter;
    this.mapID = id;
    this.SVG_DOM = null;
    this.widgetDOM = null;
    this.name = name;
    app.widgets[app.idCounter] = this;
    this.count = 0;
    this.containedWidgets = [];
    this.callerID = callerID;
    this.keys = new mindmapKeypress(this);

    // constants for drawing
    this.width = 1200; // Width of the SVG element
    this.height = 600; // Height of the SVG element
    this.nodeWidth = 150;
    this.nodeHeight = 30;
    this.toggleWidth = 20;
    this.detailWidth = 20;
    this.popupWidth = 360;
    this.detachDistance = 50;

    // variables for dragging and creating new nodes
    this.currentX=0;
    this.currentY=0;
    this.transform = [];
    this.elemsToMove = [];
    this.parentNode = null;
    this.nextSibling = null;
    this.prevSibling = null;
    this.currentParent = null;
    this.selectedNode = null;
    this.currentPosition = null;

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

  buildWidget(data) { // create blank mind map, then if an ID was passed in, call loadMap
    if (!this.name) {
      this.name = "Untitled mind map";  // The name starts off untitled; it can change later
    }

    const html = app.widgetHeader() +
      `<b idr="name">${this.name}</b>
      <input type="button" idr="save" value="Save" onclick="app.widget('save', this)">
      <input type="button" idr="saveAs" value="Save As" onclick="app.widget('save', this)">
      <input type="button" idr="details" value="Show Details" onclick="app.widget('showDetails', this)">
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
      }
      if (data[0].count) {
        this.count = data[0].count;
      }
      if (data[0].name) {
        this.name = data[0].name;
        const nameText = app.domFunctions.getChildByIdr(this.widgetDOM, 'name');
        nameText.textContent = this.name;
      }
      this.d3Functions.update();
    }
  }

  showDetails(button) {
    const row = app.domFunctions.getChildByIdr(this.widgetDOM, 'svgRow');
    const detailsCell = row.insertCell(-1);
    new widgetDetails('mindmap', detailsCell, this.mapID);
    button.value = "Hide Details";
    button.setAttribute("onclick", "app.widget('hideDetails', this)");
  }

  hideDetails(button) {
    const row = app.domFunctions.getChildByIdr(this.widgetDOM, 'svgRow');
    row.deleteCell(-1);
    button.value = "Show Details";
    button.setAttribute("onclick", "app.widget('showDetails', this)");
  }

  allowDrop(object, evnt) { // Prevent default action so drag and drop works properly. Also find parent and sibling nodes.
    evnt.preventDefault();
    this.highlightParent(evnt.clientX, evnt.clientY, null);
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

    else {
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

    const newObj = {};
    newObj.x = relX;
    newObj.y = relY;
    newObj.nodeID = data.nodeID;
    newObj.id = this.count++;
    newObj.name = name;
    newObj.type = data.type;
    newObj.details = data.details;
    newObj.parent = "null";
    newObj.children = [];

    // Trying to get reference to this class instance into the data, where anonymous functions can use it
    const instanceVars = {};
    instanceVars.nodeWidth = this.nodeWidth;
    instanceVars.nodeHeight = this.nodeHeight;
    instanceVars.toggleWidth = this.toggleWidth;
    instanceVars.popupWidth = this.popupWidth;

    newObj.instance = instanceVars;
    for (let i = 0; i < newObj.details.length; i++) {
      newObj.details[i].instance = instanceVars;
    }

    // Right here, I should check whether I dropped ONTO something. If so, instead of adding the new node as a root, I should call connectNode.
    const group = this.checkDrop(null, x, y);
    if (group) {
      this.connectNode(group, newObj);
      this.d3Functions.update();
    }
    else {
      this.d3Functions.roots.push(newObj);
      this.d3Functions.newObject = newObj;
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
    const labelObj = this.getObjFromID(id);

    labelObj.name = newObj.name;
    labelObj.nodeID = newObj.nodeID;
    labelObj.type = newObj.type;
    labelObj.details = newObj.details;
    this.d3Functions.newObject = labelObj;
  }

  newBox(element, evnt) {
    // Get positioning information
    const x = evnt.clientX;
    const y = evnt.clientY;
    const bound = this.SVG_DOM.getBoundingClientRect();
    const top = bound.top;
    const left = bound.left;
    const relX = x-left;
    const relY = y-top;

    // verify that the user doubleclicked on an EMPTY spot
    if (this.checkDrop(null, x, y) == null) {
      const newObj = this.newObj();
      newObj.x = relX;
      newObj.y = relY;
      this.d3Functions.roots.push(newObj);
      this.d3Functions.update();
    }
  }

  // Create new object with no node associated
  newObj() {
    const newObj = {};
    newObj.nodeID = null;
    newObj.id = this.count++;
    newObj.name = "";
    newObj.type = "";
    newObj.parent = "null";
    newObj.children = [];
    newObj.details = [];

    const instanceVars = {};
    instanceVars.nodeWidth = this.nodeWidth;
    instanceVars.nodeHeight = this.nodeHeight;
    instanceVars.toggleWidth = this.toggleWidth;
    instanceVars.detailWidth = this.detailWidth;
    instanceVars.popupWidth = this.popupWidth;

    newObj.instance = instanceVars;

    // Remember which node to edit
    this.d3Functions.newNode = newObj.id;
    this.d3Functions.newObject = newObj;

    return newObj;
  }

  getObjFromID(nodeID) {
    let nodeObj = null;
    let nonRootObjs = [];
    for (let i = 0; i < this.d3Functions.roots.length; i++) { // for every root...
      const root = this.d3Functions.roots[i];
      if (root.id == nodeID) { // check that root...
        nodeObj = root;
        break;
      }
      if (root.children) {
        nonRootObjs = nonRootObjs.concat(root.children); // then add its children to the list to check after roots
      }
      else if (root._children) {
        nonRootObjs = nonRootObjs.concat(root._children);
      }
    }

    while (nonRootObjs.length > 0 && nodeObj == null) { // If the parent object hasn't been found and there are more objects to check...
      const testObj = nonRootObjs.pop(); // Grab an object and check it...
      if (testObj.id == nodeID) {
        nodeObj = testObj;
        break;
      }
      if (testObj.children) {
        nonRootObjs = nonRootObjs.concat(testObj.children); // then add its children to the list of objects to check.
      }
    }

    if (nodeObj == null) {
      alert(`Error: The object belonging to the node with idr "group${nodeID}" was not found.`);
    }
    return nodeObj;
  }

  keyPressed(evnt) {
    this.keys.keyPressed(evnt);
  }

  dropConnect(node, childObj) { // Creates a link between the node being dragged and the node it was dropped onto
    // Get object representing parent node (object representing child node was already found)
    const nodeID = node.getAttribute("idr").slice(5); // the IDR will be like groupxxx
    const parentObj = this.getObjFromID(nodeID);

    if (parentObj && childObj) { // If both objects exist
      const rootIndex = this.d3Functions.roots.indexOf(childObj); // Remove the child from the roots array if it's in there
      if (rootIndex != -1) {
        this.d3Functions.roots.splice(rootIndex, 1);
      }

      // Remove the child from its parent's children array, if it's in there
      if (this.currentParent) {
        const parentID = this.currentParent.__data__.data.id;
        const parent = this.getObjFromID(parentID);
        const parentIndex = parent.children.indexOf(childObj);
        if(parentIndex != -1) {
          parent.children.splice(parentIndex, 1);
        }
      }

      // Auto-show parent's children
      if (parentObj._children) {
        parentObj.children = parentObj._children;
        parentObj._children = null;
        // const button = node.children[1]; // Every node group has three children - a node rect, a toggle rect and text - in that order.
        // this.toggleChildren(button);
      }

      // Make the child a child of the parent
      // Get index of next or previous sibling if applicable, and insert there. If no sibling, just push to the end of the children array.
      if (this.prevSibling) {
        const sibID = this.prevSibling.getAttribute("idr").slice(5);
        const prevSibObj = this.getObjFromID(sibID);
        const siblings = parentObj.children;
        const index = siblings.indexOf(prevSibObj) + 1; // Insert in the NEXT position, to come after the previous sibling
        parentObj.children.splice(index, 0, childObj);
      }

      else if (this.nextSibling) {
        const sibID = this.nextSibling.getAttribute("idr").slice(5);
        const nextSibObj = this.getObjFromID(sibID);
        const siblings = parentObj.children;
        const index = siblings.indexOf(nextSibObj); // Insert in the PREVIOUS position, to come after the next sibling
        parentObj.children.splice(index, 0, childObj);
      }

      else if (parentObj.children) {
        parentObj.children.push(childObj);
      }

      else {
        parentObj.children = [];
        parentObj.children.push(childObj);
        alert ("The parent object had no children or _children array. A children array has been created.");
      }

      // Make the parent the child's parent and remove the child's coordinates, which are no longer needed
      childObj.parent = parentObj.id;
      delete childObj.x;
      delete childObj.y;

      // Remove parent node and formatting
      this.parentNode.classList.remove("parent");
      this.parentNode = null;
      this.nextSibling = null;
      this.prevSibling = null;

      this.d3Functions.update(); // Update the mind map
    } // End if (both objects found)
  }

  selectNode(element, evnt) { // When a rectangle is clicked, records the current mouse position and the group's transformation, and sets onmousemove, onmouseup and onmouseout methods for dragging.
    evnt.preventDefault();
    if (evnt.which == 1) {
      // Because THIS is the closest SVG gets to a goddamn "Bring to front" command!
      // It just draws everything in whatever order it's listed in the DOM,
      // so to move something to the front you have to actually move the HTML that generates it forward!
      const group = element.parentElement;
      const tree = group.parentElement;
      this.SVG_DOM.appendChild(tree);
      tree.appendChild(group);

      this.currentX = evnt.clientX; // get mouse position
      this.currentY = evnt.clientY;

      if (group.__data__.data.parent == "null") { // If the element being dragged is a root, drag the whole group it's part of
        this.elemsToMove = [tree];
      }
      else { // Otherwise, get its descendants and the lines linking it to them using the getSubtree method. Also, mark its current parent.
        this.getSubtree(group);
        const parentID = group.__data__.data.parent;
        this.currentParent = app.domFunctions.getChildByIdr(this.SVG_DOM, `group${parentID}`);
        this.currentParent.classList.add("currentParent");
        this.initialPosition = [this.currentX, this.currentY];
      }
      this.getTransforms();

      element.setAttribute("onmousemove", "app.widget('moveNode', this, event)");
      element.setAttribute("onmouseout", "app.widget('releaseNode', this, event)");
      element.setAttribute("onmouseup", "app.widget('singleClick', this, event)");
      element.setAttribute("clickStage", "firstDown"); // Used to track single vs. double clicks
      setTimeout(this.noClick, 500, element);

      this.makeSelectedNode(group);
    } // end if (left button)
  }

  // Fires half a second after the mouse has been pressed, and if the mouse hasn't been released, stops listening for a click.
  noClick(element) {
    if (element.getAttribute("clickStage") == "firstDown") {
      element.setAttribute("onmouseup", "app.widget('releaseNode', this, event)");
      element.removeAttribute("clickStage");
    }
  }

  // Fires if the mouse is released less than half a second after being pressed, and NOT right after another click.
  // Registers a single click and listens for the mousedown that will start a double click.
  singleClick(element, evnt) {
    // If the mouse was released at all, ought to check for new parents/snapback
    this.releaseNode(element, evnt);


    if (element.getAttribute("clickStage") == "firstDown") { // verify that we are, in fact, waiting for a single click to finish
      element.setAttribute("onmousedown", "app.widget('secondDown', this, event)"); // Listen for a second click
      element.setAttribute("clickStage", "singleClick"); // Record that the element has been clicked
      setTimeout(this.noSecondDown, 500, element); // After 500 ms, stop waiting for double click
    }
  }

  // Fires if the mouse is pressed again within 500 ms of a single click.
  // Sets mouse move, up and out like a normal click, and listens for a double click.
  secondDown(element) {
    if (element.parentElement.__data__.data.parent != "null") {
      const parentID = element.parentElement.__data__.data.parent;
      this.currentParent = app.domFunctions.getChildByIdr(this.SVG_DOM, `group${parentID}`);
      this.currentParent.classList.add("currentParent");
    }
    element.setAttribute("onmousemove", "app.widget('moveNode', this, event)");
    element.setAttribute("onmouseup", "app.widget('doubleClick', this, event)");
    element.setAttribute("onmouseout", "app.widget('releaseNode', this, event)");
    element.setAttribute("onmousedown", "app.widget('selectNode', this, event)");
    element.setAttribute("clickStage", "secondDown");
    setTimeout(this.noDoubleClick, 500, element);
  }

  // Fires half a second after the mouse is released for the first time.
  // If the mouse hasn't been released, stops listening for a second mousedown.
  noSecondDown(element) {
    if (element.getAttribute("clickStage") == "singleClick") {
      element.setAttribute("onmousedown", "app.widget('selectNode', this, event)");
      element.removeAttribute("clickStage");
    }
  }

  doubleClick(element) {
    setTimeout(this.doubleClickProcess, 1, element, this)
  }

  // Fires if the mouse is released within half a second of being pressed for the second time.
  // Acknowledges a doubleclick and resets listeners.
  doubleClickProcess(element, instance) {
    instance.releaseNode(element)
    // Check whether the doubleclicked label has a node attached
    const id = element.getAttribute("idr").slice(4); // The idr will look like "nodexxx"
    const obj = instance.getObjFromID(id);
    if (obj.nodeID == null) { // If this label has no node attached
      instance.d3Functions.newNode = id; // Set the doubleclicked element as the new node, so it will be edited
      instance.d3Functions.editDOM.value = obj.name; // Fill the existing name in the edit textbox...
      obj.name = ""; // and remove it from the object (so it won't show up behind the textbox)
      instance.d3Functions.update(); // Finally, update the mind map, causing the text in the node to disappear and the edit box to appear.
    }

    element.removeAttribute("onmousemove");
    element.removeAttribute("onmouseout");
    element.removeAttribute("onmouseup");
    element.removeAttribute("clickStage");
  }

  // Fires half a second after the mouse is pressed for the second time.
  // If the mouse hasn't been released, stops listening for a doubleclick.
  noDoubleClick(element) {
    if (element.getAttribute("clickStage") == "secondDown") {
      element.setAttribute("onmouseup", "app.widget('releaseNode', this, event)");
      element.removeAttribute("clickStage");
    }
  }

  dragStart(SVG, evnt) {
    // Verify empty spot
    if (this.checkDrop(null, evnt.clientX, evnt.clientY) == null) {
      this.currentX = evnt.clientX; // get mouse position
      this.currentY = evnt.clientY;
      SVG.setAttribute("onmousemove", "app.widget('drag', this, event)");
      SVG.setAttribute("onmouseup", "app.widget('stopDragging', this, event)");
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

  stopDragging(SVG, evnt) {
    SVG.removeAttribute("onmousemove");
    SVG.removeAttribute("onmouseup");
  }

  moveNode (element, evnt) { // Compares current to previous mouse position to see how much the element should have moved, then moves it by that much and updates the mouse position.
    // Get amount of mouse movement, and update mouse position
    const dx = evnt.clientX - this.currentX;
    const dy = evnt.clientY - this.currentY;
    this.currentX = evnt.clientX;
    this.currentY = evnt.clientY;

    // Move everything
    for (let i = 0; i < this.elemsToMove.length; i++) {
      this.transform[i][0] += dx;
      this.transform[i][1] += dy;
      const newTransform = `translate(${this.transform[i][0]} ${this.transform[i][1]})`;
      this.elemsToMove[i].setAttribute("transform", newTransform);
    }

    // Highlight the prospective parent. Add/remove highlighting from current parent if needed.
    if (this.currentParent) {
      if (Math.abs(this.currentX - this.initialPosition[0]) < this.detachDistance
      &&  Math.abs(this.currentY - this.initialPosition[1]) < this.detachDistance) {
         this.currentParent.classList.add("currentParent");
      }
      else {
        this.currentParent.classList.remove("currentParent");
      }
    }

    this.highlightParent(evnt.clientX, evnt.clientY, element.parentElement);
  }

  highlightParent(x, y, element) {
    // Check for parent and highlight it if found
    let nextSibling = null;
    let prevSibling = null;
    let parent = null;
    if (element) { // Check for hovering over something first, but ONLY if moving an existing box!
      parent = this.checkDrop(element, x, y);
    }
    if (!parent) {
      parent = this.checkFront(element, x, y); // Then for being in front of something without kids...
    }
    if (!parent) {                                           // Finally, for being next to a potential sibling.
      nextSibling = this.checkSides(element, x, y, true);
      if (nextSibling) {
        const parentID = nextSibling.__data__.data.parent;
        parent = app.domFunctions.getChildByIdr(this.SVG_DOM, `group${parentID}`);
      }
    }
    if(!parent) {
      prevSibling = this.checkSides(element, x, y, false);
      if (prevSibling) {
        const parentID = prevSibling.__data__.data.parent;
        parent = app.domFunctions.getChildByIdr(this.SVG_DOM, `group${parentID}`);
      }
    }

    this.nextSibling = nextSibling; // This will be null unless a next sibling was searched for, and found, in this call
    this.prevSibling = prevSibling; // Ditto

    if (parent && parent != this.parentNode) { // If a new parent has been found
      parent.classList.add("parent"); // Format it as the new parent, and remove formatting from the old parent
      if (this.parentNode) {
        this.parentNode.classList.remove("parent");
      }
      this.parentNode = parent;
    }
    if (!parent && this.parentNode) { // If there's an existing parent node, but no node should be the parent node
      this.parentNode.classList.remove("parent"); // remove parent formatting
      this.parentNode = null;
    }
  }

  releaseNode(element, evnt) { // Removes all the onmousemove, onmouseup and onmouseout events which were set when the node was selected.
    // Reset mouse methods and ensure all drag variables are null
    element.removeAttribute("onmousemove");
    element.removeAttribute("onmouseup");
    // If a child became a root or vice versa
    if (this.currentParent && !this.currentParent.classList.contains("currentParent") && !this.parentNode
    || !this.currentParent && this.parentNode) {
        element.removeAttribute("onmouseout")
    }
    else {
      element.setAttribute("onmouseout", "app.widget('checkHideButtons', this, event)");
    }
    element.setAttribute("onmousedown", "app.widget('selectNode', this, event)");

    // Get object representing the label being dragged
    const group = element.parentElement;
    const groupID = group.getAttribute("idr").slice(5); // this IDR will be like groupxxx
    const labelObj = this.getObjFromID(groupID);
    this.d3Functions.newObject = labelObj;

    if (this.parentNode) { // If we dropped element (the node being moved) onto that group, we should connect them.
      if (labelObj == null) {
        alert("Error: The child object was not found.");
      }
      else this.dropConnect(this.parentNode, labelObj);
    } // end if (the node was dragged onto another node)

    else if (this.currentParent) { // if the node being dragged was a child, detach it if necessary.
                                   // Then refresh the page so it will either snap back or become a new root

      // Detach child if it's too far from parent. Since we're already tracking this with classes, why recalculate?
      if (!this.currentParent.classList.contains("currentParent")) {
        const parentID = this.currentParent.__data__.data.id;
        const parent = this.getObjFromID(parentID);
        const parentIndex = parent.children.indexOf(labelObj);
        if(parentIndex != -1) {
          parent.children.splice(parentIndex, 1);
        }
        labelObj.parent = "null";

        // Get coordinates of label and store them
        const labelRect = element.getBoundingClientRect();
        const SVGrect = this.SVG_DOM.getBoundingClientRect();
        labelObj.y = labelRect.y - SVGrect.y;
        labelObj.x = labelRect.x - SVGrect.x;
        this.d3Functions.roots.push(labelObj);
      }
      this.d3Functions.update();
    }

    this.parent = null;
    this.nextSibling = null;
    this.prevSibling = null;
    if (this.currentParent) {
      this.currentParent.classList.remove("currentParent");
    }
    this.currentParent = null;
  }

  checkDrop(element, x, y) {
    const groups = this.SVG_DOM.getElementsByClassName("node"); // Get all rectangles in the mind map

    for (let i = 0; i < groups.length; i++) { // Loop through all rectangles
      const group=groups[i];
      const bound = group.getBoundingClientRect(); // Get bounds of each rectangle
      const top = bound.top;
      const bottom = bound.bottom;
      const left = bound.left;
      const right = bound.right;
      let contains = false;
      if (element != null) {
        contains = element.contains(group);
      }

      if (top < y && y < bottom && left < x && x < right && !contains ) { // If the mouse is inside this element, and this is NOT the element being dragged or that element doesn't exist
        return group;
      }
    }
    return null;
  }

  checkFront(element, x, y) {
    const groups = this.SVG_DOM.getElementsByClassName("node"); // Get all rectangles in the mind map

    for (let i = 0; i < groups.length; i++) { // Loop through all rectangles
      const group=groups[i];
      const bound = group.getBoundingClientRect(); // Get bounds of each rectangle
      const top = bound.top;
      const bottom = bound.bottom;
      const left = bound.left;
      const right = bound.right;
      let contains = false;
      if (element) {
        contains = element.contains(group);
      }
      const kids = group.__data__.data.children;
      const noKids = (kids == null || kids.length < 1); // true if the group represents a node with no chldren visible

      // If the mouse is in front of this element, the element doesn't have visible children,
      // and this is NOT the element being dragged or that element doesn't exist
      if (top < y && y < bottom && right < x && x < right + 2*this.toggleWidth && !contains &&noKids) {
        return group;
      }
    }
    return null;
  }

  checkSides(element, x, y, topBool) {
    const groups = this.SVG_DOM.getElementsByClassName("node"); // Get all rectangles in the mind map

    for (let i = 0; i < groups.length; i++) { // Loop through all rectangles
      const group=groups[i];
      const bound = group.getBoundingClientRect(); // Get bounds of each rectangle
      const top = bound.top;
      const bottom = bound.bottom;
      const left = bound.left;
      const right = bound.right;
      let contains = false;
      if (element) {
        contains = element.contains(group);
      }
      const notRoot = !(group.__data__.data.parent == "null"); // true if the group represents a node that isn't a root

      // Where to look depends on whether we're checking the top or bottom of the node
      let topBound = top - 20;
      let bottomBound = top;
      if (topBool == false) {
        topBound = bottom;
        bottomBound = bottom + 20;
      }
      // If the mouse is above this element, the element isn't a root,
      // and this is NOT the element being dragged or that element doesn't exist
      if (topBound < y && y < bottomBound && left < x && x < right && !contains &&notRoot) {
        return group;
      }
    }
    return null;
  }

  getSubtree(element) {
    // Get array of ALL SVG elements to move - this node, all its children and the lines connecting it to its children
    const nodeID = element.getAttribute("idr").slice(5); // the IDR will be like groupxxx
    const nodeObj = this.getObjFromID(nodeID); // Get the object representing this node
    this.elemsToMove = [element]; // A list of all elements that need to move. It starts with just the node being dragged.
    if (nodeObj.children) {
      let descendantObjs = nodeObj.children.slice(); // To list the node's descendants, start with its children. slice makes a shallow copy.
      while (descendantObjs.length > 0) {
        const currentObj = descendantObjs.pop(); // Grab a descendant object...
        let descendantSVG = app.domFunctions.getChildByIdr(this.SVG_DOM, `group${currentObj.id}`); // Get the node associated with that object
        const linkSVG = app.domFunctions.getChildByIdr(this.SVG_DOM, `link${currentObj.parent}to${currentObj.id}`); // Get the line linking that object to its parent
        this.elemsToMove.push(descendantSVG);
        this.elemsToMove.push(linkSVG);  // Add them both to the list of things to move
        if (currentObj.children) {
          descendantObjs = descendantObjs.concat(currentObj.children);
        } // Add the descendant's children (if any) to the array of descendants
      }
    }
    // When this method finishes, this.elemsToMove will contain the element, all its descendants and the lines linking them - a subtree.
  }

  getTransforms() {
    this.transform = []; // Starts off as an empty array
    // For every item in elemsToMove, extract the current transform. Store in a 2D array where the first subscript represents the object and the second represents the coordinate (x or y).
    for (let i = 0; i < this.elemsToMove.length; i++) {
      const transform = this.elemsToMove[i].getAttribute("transform");
      if (transform) {
        this.transform[i] = transform.slice(10, -1).split(' '); // Get the transformation string and extract the coordinates
      }
      else {
        this.transform[i] = ["0","0"];
      }
      this.transform[i][0] = parseFloat(this.transform[i][0]);
      this.transform[i][1] = parseFloat(this.transform[i][1]);
    }
  }

  save (button) { // Saves the current state of the graph to the database.
    let name = this.name;
    const id = this.mapID;
    if (name == "Untitled mind map" || !id || button.getAttribute("idr") == "saveAs") {  // If the mind map doesn't have a name or doesn't have an ID (indicating that it hasn't been saved),
                                                                        // or if the user clicked the "Save As" button, indicating they want to change the name, ask for a name.
      name = prompt("Please enter the name for this mind map", name);
    }

    const rootsCopy = JSON.parse(JSON.stringify(this.d3Functions.roots));

    for (let i=0; i< rootsCopy.length; i++) { // Go through all the roots and add their transform values to their coordinates, so they'll display in the right places.
        const root = rootsCopy[i];
        const id = root.id;
        const group = app.domFunctions.getChildByIdr(this.SVG_DOM, `tree${id}`);
        const transform = group.getAttribute("transform").slice(10, -1).split(' '); // Get the transformation string and extract the coordinates
        root.x = parseFloat(transform[0]);
        root.y = parseFloat(transform[1]);
    }

    // DBREPLACE DB function: createNode
    // JSON object: {name:"mindmap"; type:"mindmap"; details:{name:name}; merge:true; changes:{roots:app.stringEscape(JSON.stringify(rootsCopy)); count:this.count}}
    const query = `merge (mindmap: mindmap {name:"${name}"}) with mindmap set mindmap.roots="${app.stringEscape(JSON.stringify(rootsCopy))}", mindmap.count = ${this.count}`;

    app.db.setQuery(query);
    app.db.runQuery();
  }

  lookForEnter(input, evnt) { // Makes hitting enter do the same thing as blurring (e. g. inserting a new node or changing an existing one)
    if (evnt.keyCode === 13) {
      input.onblur();
    }
  }

  saveInput(edit) {
    if (this.d3Functions.newNode) { // This SHOULD only run when there's a new node, but it doesn't hurt to check
      const newObj = this.getObjFromID(this.d3Functions.newNode);
      newObj.name = edit.value;
      this.d3Functions.newNode = null;
    }
    // Even if there is no new object, hide and move the edit text box and refresh
    edit.hidden = true;
    edit.value = "";
    edit.setAttribute("style", "position:static");
    this.SVG_DOM.appendChild(edit);
    this.d3Functions.update();
  }

  toggleChildren(button) { // Toggle children.
    const group = button.parentElement;
    const d = group.__data__;


    if (d.data.children) {
      let label = null;
      let descendant = false;
      // First, if the edit textbox is visible and attached to one of the node's children, blur it.
      if (this.d3Functions.newNode) { // this.d3Functions.newNode is true when a node has just been created and the edit box hasn't been blurred yet
        label = this.getObjFromID(this.d3Functions.newNode);
        descendant = false;
        while (label.parent != "null") {
          if (d.data.children.indexOf(label) != -1) {
            descendant = true;
            break;
          }
          else {
            const newID = label.parent;
            label = this.getObjFromID(newID);
          }
        }
        // descendant is now true if the new label is a descendant of the label being toggled
        if (descendant) {
          this.d3Functions.editDOM.blur();
        }
      }

      // Now do the same for the notes textarea
      if (this.notesLabel) { // this.notesLabel is true when a node's notes are being edited
        label = this.notesLabel;
        descendant = false;
        while (label.parent != "null") {
          if (d.data.children.indexOf(label) != -1) {
            descendant = true;
            break;
          }
          else {
            const newID = label.parent;
            label = this.getObjFromID(newID);
          }
        }
        // descendant is now true if the label being edited is a descendant of the label being toggled
        if (descendant) {
          this.notesText.blur();
        }
      }

  	  d.data._children = d.data.children;
  	  d.data.children = null;
    }
    else {
  	  d.data.children = d.data._children;
  	  d.data._children = null;
    }
    this.makeSelectedNode(group);
    this.d3Functions.update();
  }

  toggleDetails(button) {
    const group = button.parentElement;
    const ID = group.getAttribute("idr").slice(5); // the IDR will be like groupxxx
    const obj = this.getObjFromID(ID);
    if (obj.nodeID || obj.type == "link") {
      // Look for an existing popup for this node (there should be one).
      const popup = app.domFunctions.getChildByIdr(group, `popupGroup${ID}`);
      const tree = group.parentElement;
      if (popup.classList.contains("hidden")) {
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

  toggleNotes(button) {
    const ID = button.getAttribute("idr").slice(4); // idr is like notexxx
    const obj = this.getObjFromID(ID);
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
      this.notesText.hidden=false;
      let heightString = "";
      let widthString = "";

      // Get the object data
      if (obj.notes) {
        this.notesText.value = obj.notes;
      }

      if (obj.notesHeight) {
        heightString = ` height:${obj.notesHeight}px;`;
      }

      if (obj.notesWidth) {
        widthString = ` width:${obj.notesWidth}px;`;
      }

      // Get the rectangle
      const rect = app.domFunctions.getChildByIdr(this.SVG_DOM, `node${ID}`);
      const bounds = rect.getBoundingClientRect();
      // Makes the notes text area visible
      let leftPos = bounds.left + window.scrollX + this.nodeWidth;
      let topPos = bounds.top + window.scrollY;
      this.notesText.setAttribute("style", `position:absolute; left:${leftPos}px; top:${topPos}px;${heightString}${widthString}`);

      this.notesLabel = obj;
      this.notesText.select();

      this.makeSelectedNode(rect.parentElement);
    } // end else (notes are not shown; show them)
  }

  showNode(button) {
    const data = button.parentElement.parentElement.__data__.data;
    const id = data.nodeID;
    const type = data.type;

    if (type == 'mindmap') {
      new widgetSVG(this.widgetID, id);
    }
    else if (type == "calendar") {
      setTimeout(this.showCalendar, 1, this.widgetID, id);
    }

    else if (type == "link") {
      window.open(data.details[0].value); // For now, assume the uri is the first (and only) detail
    }

    else {
      new widgetNode(this.widgetID, type, id);
    }
  }

  showCalendar(widgetID, id) {
    new widgetCalendar(widgetID, id);
  }

  disassociate(button, evnt) {
    // Get object
    const ID = button.getAttribute("idr").slice(12); // This IDR will be like "disassociatexxx"
    const obj = this.getObjFromID(ID);
    // reset node ID, type and details
    obj.nodeID = null;
    obj.type = "";
    obj.details = [];

    // Close detail popup
    const popup = app.domFunctions.getChildByIdr(this.SVG_DOM, `popupGroup${ID}`);
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

  // Make the buttons visible when the main rect is moused over
  showButtons(rect) {
    const group = rect.parentElement;
    const ID = group.getAttribute("idr").slice(5); // the IDR will be like groupxxx

    const prefixes = ["toggle", "toggleText1", "toggleText2",
                      "note", "showNotesText1", "showNotesText2",
                      "detail", "showDetailsText1", "showDetailsText2"];
    for (let i = 0; i < prefixes.length; i++) {
      const idr = prefixes[i] + ID;
      const element = app.domFunctions.getChildByIdr(this.SVG_DOM, idr);
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

    const prefixes = ["node", "toggle", "note", "detail"];
    for (let i = 0; i < prefixes.length; i++) {
      const idr = prefixes[i] + ID;
      const element = app.domFunctions.getChildByIdr(this.SVG_DOM, idr);
      const bound = element.getBoundingClientRect();
      const inElement = bound.left <= x && x <= bound.right && bound.top <= y && y <= bound.bottom;
      if (inElement) {
        inAnything = true;
        break;
      }
    }

    const detailPopup = app.domFunctions.getChildByIdr(group, `popupGroup${ID}`);
    const popupOpen = !(detailPopup.classList.contains("hidden"));

    const obj = this.getObjFromID(ID);
    const editing = this.notesLabel == obj;

    if (!(inAnything || popupOpen || editing)) {
      this.hideEverything(ID);
    }
  }

  hideEverything(ID) {
    const prefixes = ["toggle", "toggleText1", "toggleText2", "toggleExpln",
                      "note", "showNotesText1", "showNotesText2",
                      "detail", "detailExpln", "showDetailsText1", "showDetailsText2",
                      "popupGroup"];

    for (let i = 0; i < prefixes.length; i++) {
      const idr = prefixes[i] + ID;
      const element = app.domFunctions.getChildByIdr(this.SVG_DOM, idr);
      element.classList.add("hidden");
    }

    const obj = this.getObjFromID(ID);
    const editing = this.notesLabel == obj;

    if(editing) {
      const note = app.domFunctions.getChildByIdr(this.SVG_DOM, `note${ID}`);
      this.toggleNotes(note);
    }
  }

  // Show the toggle explanation text
  toggleExplain(button) {
    const group = button.parentElement;
    const tree = group.parentElement;
    const ID = group.getAttribute("idr").slice(5); // the IDR will be like groupxxx
    const text = app.domFunctions.getChildByIdr(group, `toggleExpln${ID}`);
    const box = app.domFunctions.getChildByIdr(group, `toggleExpBox${ID}`);

    this.SVG_DOM.appendChild(tree);
    tree.appendChild(group);
    group.appendChild(box);
    group.appendChild(text);

    const data = group.__data__.data;
    if ((!data.children || data.children.length == 0) && (!data._children || data._children.length == 0)) {
      text.classList.remove("hidden");
      box.classList.remove("hidden");
    }
  }

  // Hide the toggle explanation text
  hideToggleExplain(button) {
    const group = button.parentElement;
    const ID = group.getAttribute("idr").slice(5); // the IDR will be like groupxxx
    const text = app.domFunctions.getChildByIdr(group, `toggleExpln${ID}`);
    const box = app.domFunctions.getChildByIdr(group, `toggleExpBox${ID}`);
    text.classList.add("hidden");
    box.classList.add("hidden");
  }

  detailExplain(button) {
    const group = button.parentElement;
    const tree = group.parentElement;
    const ID = group.getAttribute("idr").slice(5); // the IDR will be like groupxxx
    const text = app.domFunctions.getChildByIdr(group, `detailExpln${ID}`);
    const box = app.domFunctions.getChildByIdr(group, `detailExpBox${ID}`);

    this.SVG_DOM.appendChild(tree);
    tree.appendChild(group);
    group.appendChild(box);
    group.appendChild(text);

    const data = group.__data__.data;
    if (data.nodeID == null && data.type != "link") {
      text.classList.remove("hidden");
      box.classList.remove("hidden");
    }
  }

  hideDetailExplain(button) {
    const group = button.parentElement;
    const ID = group.getAttribute("idr").slice(5); // the IDR will be like groupxxx
    const text = app.domFunctions.getChildByIdr(group, `detailExpln${ID}`);
    const box = app.domFunctions.getChildByIdr(group, `detailExpBox${ID}`);
    text.classList.add("hidden");
    box.classList.add("hidden");
  }
}
