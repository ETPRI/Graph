class widgetSVG {
  constructor (callerID, id) { // create variables, then call buildWidget()
    this.widgetID = app.idCounter;
    this.mapID = id;
    this.SVG_DOM = null;
    this.widgetDOM = null;
    this.name = null;
    app.widgets[app.idCounter] = this;
    this.count = 0;
    this.containedWidgets = [];
    this.callerID = callerID;

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

    // data for making trees. This will hold an array of objects.
    // each with a name, a parent (although the parent will be null), x and y coordinates and a children array, as well as other data not needed for a tree.
    // The children array will include other objects making a tree.
    this.roots = [];

    // used for creating new nodes and editing existing ones
    this.newObject = null;
    this.newNode = null;
    this.editDOM = null;

    this.buildWidget();
  } // end constructor

  buildWidget() { // create blank mind map, then if an ID was passed in, call loadMap
    this.name = "Untitled mind map";  // The name starts off untitled; it can change later

    const html = app.widgetHeader() +
      `<b idr="name">${this.name}</b>
      <input type="button" idr="save" value="Save" onclick="app.widget('save', this)">
      <input type="button" idr="saveAs" value="Save As" onclick="app.widget('save', this)">
      <input type="button" idr="details" value="Show Details" onclick="app.widget('showDetails', this)">
    </div>
    <div><table><tr idr="svgRow"><td>
      <svg id="svg${this.widgetID}" width="${this.width}" height="${this.height}"
        ondblclick="app.widget('newBox', this, event)"
        ondragover="app.widget('allowDrop', this, event)"
        ondrop="app.widget('dropAdd', this, event)"
    </svg></td></tr></table></div></div>`;

    const parent = document.getElementById('widgets');
    const caller = document.getElementById(this.callerID);
    const newWidget = document.createElement('div'); // create placeholder div
    parent.insertBefore(newWidget, caller); // Insert the new div before the first existing one
    newWidget.outerHTML = html; // replace placeholder with the div that was just written
    this.SVG_DOM = document.getElementById(`svg${this.widgetID}`);
    this.widgetDOM = document.getElementById(`${this.widgetID}`);

    if (app.activeWidget) {
      app.activeWidget.classList.remove("activeWidget");
    }
    app.activeWidget = this.widgetDOM;
    this.widgetDOM.classList.add("activeWidget");

    this.editDOM = document.createElement("input");
    this.editDOM.setAttribute("type", "text");
    this.editDOM.setAttribute("onblur", "app.widget('saveInput', this)");
    this.editDOM.setAttribute("onkeydown", "app.widget('lookForEnter', this, event)");
    this.editDOM.setAttribute("hidden", "true");
    this.editDOM.setAttribute("idr", "edit");
    this.SVG_DOM.appendChild(this.editDOM);


    if (this.mapID) {
      this.loadMap();
    }
  } // end buildWidget

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

  loadMap () { // Call database to get the trees for this mind map and their locations, then call loadComplete().
    const query = `match (mindmap:mindmap) where ID(mindmap) = ${this.mapID} return mindmap.roots as roots, mindmap.count as count, mindmap.name as name`;
    app.db.setQuery(query);
    app.db.runQuery(this, 'loadComplete');
  } // end load

  loadComplete(data) { // Sets the roots array for the mind map to match the data that was loaded, then calls update() to draw the mind map
    if (data.length == 0) {
      alert ("Error: Mind map not found");
    }
    else if (data.length > 1) {
      alert ("Error: Multiple mind maps found with same name");
    }
    else { // If one result was returned - which should always happen
      if (data[0].roots) {
        this.roots = JSON.parse(data[0].roots);
      }
      if (data[0].count) {
        this.count = data[0].count;
      }
      if (data[0].name) {
        this.name = data[0].name;
        const nameText = app.domFunctions.getChildByIdr(this.widgetDOM, 'name');
        nameText.textContent = this.name;
      }
      this.update();
    }
  }

  allowDrop(object, evnt) { // Prevent default action so drag and drop works properly. Also find parent and sibling nodes.
    evnt.preventDefault();
    this.highlightParent(evnt.clientX, evnt.clientY, null);
  }

  dropAdd (svg, evnt) { // Add node to the list of root nodes in the mind map and call update.
    const dataText = evnt.dataTransfer.getData("text/plain");
    const data = JSON.parse(dataText);

    if (data.sourceType == "widgetTableNodes" && data.sourceTag == "TD") { // If the object being dragged is a node
      const name = data.name;

      const x = evnt.clientX;
      const y = evnt.clientY;
      const bound = svg.getBoundingClientRect();
      const top = bound.top;
      const left = bound.left;
      const relX = x-left;
      const relY = y-top;

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
      instanceVars.detailWidth = this.detailWidth;
      instanceVars.popupWidth = this.popupWidth;

      newObj.instance = instanceVars;
      for (let i = 0; i < newObj.details.length; i++) {
        newObj.details[i].instance = instanceVars;
      }

      // Right here, I should check whether I dropped ONTO something. If so, instead of adding the new node as a root, I should call connectNode.
      const group = this.checkDrop(null, x, y);
      if (group) {
        this.connectNode(group, newObj);
        this.update();
      }
      else {
        this.roots.push(newObj);
        this.newObject = newObj;
        this.update();
      }

      // Make this the active widget
      if (app.activeWidget) {
        app.activeWidget.classList.remove("activeWidget");
      }
      app.activeWidget = this.widgetDOM;
      this.widgetDOM.classList.add("activeWidget");
    }
  }

  connectNode(group, newObj) {
    const id = group.getAttribute("idr").slice(5);
    const labelObj = this.getObjFromID(id);

    labelObj.name = newObj.name;
    labelObj.nodeID = newObj.nodeID;
    labelObj.type = newObj.type;
    labelObj.details = newObj.details;
    this.newObject = labelObj;
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
      this.roots.push(newObj);
      this.update();
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
    this.newNode = newObj.id;
    this.newObject = newObj;

    return newObj;
  }

  getObjFromID(nodeID) {
    let nodeObj = null;
    let nonRootObjs = [];
    for (let i = 0; i < this.roots.length; i++) { // for every root...
      const root = this.roots[i];
      if (root.id == nodeID) { // check that root...
        nodeObj = root;
        break;
      }
      if (root.children) {
        nonRootObjs = nonRootObjs.concat(root.children); // then add its children to the list to check after roots
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
    if (evnt.target != this.editDOM) {
      switch (evnt.which) {
        case 9:
          evnt.preventDefault();  // Don't jump around the page
          this.tabKey();
          break;
        case 13:
          this.enterKey();
          break;
        case 27:
          this.escapeKey();
          break;
        case 37:
          this.leftArrow();
          break;
        case 38:
          evnt.preventDefault(); // Don't scroll
          this.upDownArrow(-1); // On an up arrow, go to the previous sibling - SUBTRACT 1 from current index
          break;
        case 39:
          this.rightArrow();
          break;
        case 40:
          evnt.preventDefault(); // Don't scroll
          this.upDownArrow(1); // on a down arrow, go to the next sibling -- ADD 1 to current index
          break;
        case 46:
        case 8:
          this.deleteKey();
          break;
      }
    }
  }

  // Creates a new blank node which is a child of the selected node
  tabKey() {
    if (this.selectedNode) {
      const nodeID = this.selectedNode.getAttribute("idr").slice(5); // the IDR will be like groupxxx
      const nodeObj = this.getObjFromID(nodeID); // Get the object representing this node

      if (nodeObj._children && nodeObj._children.length > 0) { // If the object has children, but they are hidden, show them.
        const button = this.selectedNode.children[1]; // Every node group has five children - a node rect, a toggle rect,
        // a details rect, a details popup, and text - in that order. So the button is the child with index 1.
        this.toggle(button);
        // The children, if any, should now be visible, and the object should have a children array.
      }

      const child = this.newObj(); // Create a new blank label object...
      child.parent = nodeID;
      nodeObj.children.push(child); // make it a new child of the selected node...
      this.update(); // and redraw the graphic.
    }
  }

  // If NOT currently editing a node (in which case, hitting Enter just means "Done editing"),
  // create a new younger sibling for the node.
  enterKey() {
    if (this.selectedNode) {
      const nodeID = this.selectedNode.getAttribute("idr").slice(5); // the IDR will be like groupxxx
      const nodeObj = this.getObjFromID(nodeID); // Get the object representing this node
      const parentID = nodeObj.parent;
      if (parentID != "null") { // IF the selected node has a parent, it can have siblings
      const parent = this.getObjFromID(parentID);
        const child = this.newObj();

        const index = parent.children.indexOf(nodeObj) + 1; // Insert in the NEXT position, to come after the previous sibling
        parent.children.splice(index, 0, child);
        child.parent = parentID;
        this.update();
      }
    }
  }

  // deselects the selected node
  escapeKey() {
    if (this.selectedNode) {
      this.selectedNode.classList.remove("selected");
      this.selectedNode = null;
      this.update();
    }
  }

  // Deletes the selected node and all of its children
  deleteKey() {
    if (this.selectedNode) {
      const nodeID = this.selectedNode.getAttribute("idr").slice(5); // the IDR will be like groupxxx
      const nodeObj = this.getObjFromID(nodeID); // Get the object representing this node
      const parentID = nodeObj.parent;
      if (parentID != "null") { // If the object has a parent, remove it from its parent's children array
        const parentObj = this.getObjFromID(parentID);
        const parentIndex = parentObj.children.indexOf(nodeObj);
        if(parentIndex != -1) {
          parentObj.children.splice(parentIndex, 1);
        }
      }
      else { // If the object is a root, remove it from the roots array
        const rootIndex = this.roots.indexOf(nodeObj);
        if(rootIndex != -1) {
          this.roots.splice(rootIndex, 1);
        }
      }
      this.update();
    }
  }

  // Selects the parent of the selected node
  leftArrow() {
    if (this.selectedNode) {
      const nodeID = this.selectedNode.getAttribute("idr").slice(5); // the IDR will be like groupxxx
      const nodeObj = this.getObjFromID(nodeID); // Get the object representing this node
      const parentID = nodeObj.parent;
      if (parentID != "null") { // If the object has a parent, select the parent
        const parentGroup = app.domFunctions.getChildByIdr(this.SVG_DOM, `group${parentID}`);
        this.selectedNode.classList.remove("selected");
        this.selectedNode = parentGroup;
        parentGroup.classList.add("selected");
        this.update();
      }
    }
  }

  // Selects the first child of the selected node
  rightArrow() {
    if (this.selectedNode) {
      const nodeID = this.selectedNode.getAttribute("idr").slice(5); // the IDR will be like groupxxx
      const nodeObj = this.getObjFromID(nodeID); // Get the object representing this node
        if (nodeObj._children && nodeObj._children.length > 0) { // If the object has children, but they are hidden, show them.
          const button = this.selectedNode.children[1]; // Every node group has five children - a node rect, a toggle rect,
          // a details rect, a details popup, and text - in that order. So the button is the child with index 1.
          this.toggle(button);
          // The children, if any, should now be visible.
        }
      if (nodeObj.children && nodeObj.children.length > 0) { // If the object has children, select the oldest child
        const childObj = nodeObj.children[0];
        const childID = childObj.id;
        const childGroup = app.domFunctions.getChildByIdr(this.SVG_DOM, `group${childID}`);
        this.selectedNode.classList.remove("selected");
        this.selectedNode = childGroup;
        childGroup.classList.add("selected");
        this.update();
      }
    }
  }

  // Go to the previous sibling, if any. If this is the first sibling, cycle around to the last one.
  upDownArrow(offset) {
    if (this.selectedNode) {
      const nodeID = this.selectedNode.getAttribute("idr").slice(5); // the IDR will be like groupxxx
      const nodeObj = this.getObjFromID(nodeID); // Get the object representing this node
      const parentID = nodeObj.parent;
      if (parentID != "null") { // If the object has a parent, we can cycle through its siblings, if any
        const parentObj = this.getObjFromID(parentID);
        const parentIndex = parentObj.children.indexOf(nodeObj);
        let newIndex = parentIndex + offset; // Add 1 to the index to go forward (down arrow). Subtract 1 to go back (up arrow)

        // If we go too far backwards, the index will be -1. Cycle around to the last item
        if (newIndex == -1) {
          newIndex = parentObj.children.length - 1;
        }

        // If we go too far forward, the index will be equal to the array length. Cycle around to the first item.
        if (newIndex == parentObj.children.length) {
          newIndex = 0;
        }

        const siblingObj = parentObj.children[newIndex];
        const siblingID = siblingObj.id;
        const siblingGroup = app.domFunctions.getChildByIdr(this.SVG_DOM, `group${siblingID}`);

        this.selectedNode.classList.remove("selected");
        this.selectedNode = siblingGroup;
        siblingGroup.classList.add("selected");
      }
      this.update();
    }
  }


  dropConnect(node, childObj) { // Creates a link between the node being dragged and the node it was dropped onto
    // Get object representing parent node (object representing child node was already found)
    const nodeID = node.getAttribute("idr").slice(5); // the IDR will be like groupxxx
    const parentObj = this.getObjFromID(nodeID);

    if (parentObj && childObj) { // If both objects exist
      const rootIndex = this.roots.indexOf(childObj); // Remove the child from the roots array if it's in there
      if (rootIndex != -1) {
        this.roots.splice(rootIndex, 1);
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
        const button = node.children[1]; // Every node group has three children - a node rect, a toggle rect and text - in that order.
        this.toggle(button);
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

      this.update(); // Update the mind map
    } // End if (both objects found)
  }

  selectNode(element, evnt) { // When a rectangle is clicked, records the current mouse position and the group's transformation, and sets onmousemove, onmouseup and onmouseout methods for dragging.
    evnt.preventDefault();
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
    element.setAttribute("onmouseout", "app.widget('releaseNode', this)");
    element.setAttribute("onmouseup", "app.widget('singleClick', this)");
    element.setAttribute("clickStage", "firstDown"); // Used to track single vs. double clicks
    setTimeout(this.noClick, 500, element);

    if (this.selectedNode) {
      this.selectedNode.classList.remove("selected");
    }
    this.selectedNode = group;
    this.selectedNode.classList.add("selected");
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
  singleClick(element) {
    // If the mouse was released at all, ought to check for new parents/snapback
    this.releaseNode(element);


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
      instance.newNode = id; // Set the doubleclicked element as the new node, so it will be edited
      instance.editDOM.value = obj.name; // Fill the existing name in the edit textbox...
      obj.name = ""; // and remove it from the object (so it won't show up behind the textbox)
      instance.update(); // Finally, update the mind map, causing the text in the node to disappear and the edit box to appear.
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

  releaseNode(element) { // Removes all the onmousemove, onmouseup and onmouseout events which were set when the node was selected.
    // Get object representing the label being dragged
    const group = element.parentElement;
    const groupID = group.getAttribute("idr").slice(5); // this IDR will be like groupxxx
    const labelObj = this.getObjFromID(groupID);
    this.newObject = labelObj;

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
        this.roots.push(labelObj);
      }
      this.update();
    }

    // Reset mouse methods and ensure all drag variables are null
    element.removeAttribute("onmousemove");
    element.removeAttribute("onmouseup");
    element.removeAttribute("onmouseout");
    element.setAttribute("onmousedown", "app.widget('selectNode', this, event)");
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

    const rootsCopy = JSON.parse(JSON.stringify(this.roots));

    for (let i=0; i< rootsCopy.length; i++) { // Go through all the roots and add their transform values to their coordinates, so they'll display in the right places.
        const root = rootsCopy[i];
        const id = root.id;
        const group = app.domFunctions.getChildByIdr(this.SVG_DOM, `tree${id}`);
        const transform = group.getAttribute("transform").slice(10, -1).split(' '); // Get the transformation string and extract the coordinates
        root.x = parseFloat(transform[0]);
        root.y = parseFloat(transform[1]);
    }

    const query = `merge (mindmap: mindmap {name:"${name}"}) with mindmap set mindmap.roots="${app.stringEscape(JSON.stringify(rootsCopy))}", mindmap.count = ${this.count}`;

    app.db.setQuery(query);
    app.db.runQuery();
  }

  update() { // Creates a group for each item in the array of roots, then calls buildTree to make a tree for each group.
    const groups = d3.select(`#svg${this.widgetID}`).selectAll("g.tree")
      .data(this.roots, function(d) {return d.name;});
    if (groups._enter) {
      const newTrees = groups.enter()
        .append("g")
          .attr("class", "tree")
          .attr("idr", function(d) {return `tree${d.id}`})
          .attr("nodeWidth", this.nodeWidth)
          .attr("nodeHeight", this.nodeHeight)
          .attr("toggleWidth", this.toggleWidth)
          .attr("detailWidth", this.detailWidth)
          .attr("popupWidth", this.popupWidth)
          .attr("transform", function(d) {return "translate(" + d.x + " " + d.y + ")";} )
      newTrees.each(this.buildTree);
    }
    if (groups._groups) {
      groups.each(this.buildTree);
    }
    if (groups._exit) {
      groups.exit().remove();
    }


    //Truncate label names that are too long
    const texts = document.getElementsByClassName("nodeText");
    for (let i = 0; i < texts.length; i++) {
      if (texts[i].getComputedTextLength() > this.nodeWidth - 10) { // Allow a 5-px cushion
        texts[i].innerHTML += "...";
        while (texts[i].getComputedTextLength() > this.nodeWidth - 10) { // Remove one character at a time, keeping the ellipsis
          texts[i].innerHTML = texts[i].innerHTML.substring(0, texts[i].innerHTML.length-4) + "...";
        }
      }
    }

    // Same for detailText
    const detailTexts = document.getElementsByClassName("detailText");
    for (let i = 0; i < detailTexts.length; i++) {
      if (detailTexts[i].getComputedTextLength() > this.popupWidth - 10) { // Allow a 5-px cushion
        detailTexts[i].innerHTML += "...";
        while (detailTexts[i].getComputedTextLength() > this.popupWidth - 10) { // Remove one character at a time, keeping the ellipsis
          detailTexts[i].innerHTML = detailTexts[i].innerHTML.substring(0, detailTexts[i].innerHTML.length-4) + "...";
        }
      }
    }

    // Now the detail header. Tricky part here: There are two pieces of info, the name and type.
    // I'm going to truncate this normally for now (hiding the type), and discuss later.
    // Truncating just the name sounds better to me, but hard to make foolproof.
    // If I start trimming just before " Type: ", some damn fool is sure to put that in someone's name.
    const detailHeaders = document.getElementsByClassName("detailHeaderText");
    for (let i = 0; i < detailHeaders.length; i++) {
      if (detailHeaders[i].getComputedTextLength() > this.popupWidth - (2*this.nodeHeight + 10)) { // Allow a 5-px cushion; leave room for buttons
        detailHeaders[i].innerHTML += "...";
        while (detailHeaders[i].getComputedTextLength() > this.popupWidth - (2*this.nodeHeight + 10)) { // Remove one character at a time, keeping the ellipsis
          detailHeaders[i].innerHTML = detailHeaders[i].innerHTML.substring(0, detailHeaders[i].innerHTML.length-4) + "...";
        }
      }
    }

    // Finally, see if there's a new (blank) node. If so, append a text box to it to get the name,
    // then make it NOT the new node anymore. Similarly, check for a new object (whether attached to a blank node or not).
    // If there is one, make it the selected node.
    if (this.newNode) {
      const newNode = app.domFunctions.getChildByIdr(this.SVG_DOM, `node${this.newNode}`);
      this.SVG_DOM.parentElement.appendChild(this.editDOM);
      this.editDOM.hidden=false;
      const bounds = newNode.getBoundingClientRect();
      this.editDOM.setAttribute("style", `position:absolute; left:${bounds.left + window.scrollX}px; top:${bounds.top + window.scrollY}px`);
      this.editDOM.select(); // This isn't working. Back-burner goal: Figure out why; study focus in general; fix focus in dragDrop table
    }
    if (this.newObject) {
      const id = this.newObject.id;
      const select = app.domFunctions.getChildByIdr(this.SVG_DOM, `group${id}`);
      if (select) {
        if (this.selectedNode) { // If there was already a selected node, deselect it.
          this.selectedNode.classList.remove("selected");
        }
        this.selectedNode = select;
        this.selectedNode.classList.add("selected");
      }
      this.newObject = null;
    }
  }

  // Builds an individual tree, given the data to build it from and the group to build it in.
  // Only called by update, which passes in the appropriate values for each tree.
  // NOTE: I don't know why yet, but it seems that when building a group for each tree, data is stored in d.
  // When building a node for each leaf WITHIN a tree (in buildTree), data is stored in d.data.
  buildTree(datum, index, group) {
    const buildPopup = function(datum, index, group) {
      const texts = d3.select(this).select(".detailPopupHidden").selectAll(".detailText")
        .data(datum.data.details, function(d) {return d.field});

      texts.enter().append("text")
        .attr("class", "detailText")
        .text(function(d) {return `${d.field}: ${d.value}`})
        .attr("transform", function(d, i) {return `translate(-${d.instance.detailWidth + d.instance.popupWidth/2}
                                                              ${20 -d.instance.nodeHeight*i})`})

      texts.text(function(d) {return `${d.field}: ${d.value}`});
      texts.exit().remove();
    }

    const tree = d3.tree()
    	.nodeSize([50, 200]);

    const root = d3.hierarchy(datum);
    const nodes = root.descendants();

    const links = tree(root).links();

    // Update the nodes…
    const g = d3.select(this);
    const node = g.selectAll(".node") // This means that all the nodes inside the given group are part of this tree
     .data(nodes, function(d) {return d.id || d.data.id;}) // Update what data to include. Each group represents one node.
     .attr("transform", function(d) { return "translate(" + d.y + " " + d.x + ")"; });

    // Enter any new nodes
    const nodeEnter = node.enter().append("g") // Append a "g" for each new node
  	  .attr("class", "node")
  	  .attr("transform", function(d) { return "translate(" + d.y + " " + d.x + ")"; })
      .attr("idr", function (d) {return `group${d.data.id}`; });

    nodeEnter.append("rect")
      .attr("width", this.getAttribute("nodeWidth"))
      .attr("height", this.getAttribute("nodeHeight"))
      .attr("idr", function (d) {return `node${d.data.id}`; })
      .attr("class", "nodeRect")
      .attr("onmousedown", "app.widget('selectNode', this, event)");

    nodeEnter.append("rect")
      .attr("width", this.getAttribute("toggleWidth"))
      .attr("height", this.getAttribute("nodeHeight"))
      .attr("idr", function(d) {return `toggle${d.data.id}`})
      .attr("transform", `translate(${this.getAttribute("nodeWidth")} 0)`)
      .attr("onmouseover", "app.widget('toggle', this)")
      .attr("class", "toggleRect");

    nodeEnter.append("rect")
      .attr("width", this.getAttribute("detailWidth"))
      .attr("height", this.getAttribute("nodeHeight"))
      .attr("idr", function(d) {return `detail${d.data.id}`})
      .attr("transform", `translate(-${this.getAttribute("detailWidth")} 0)`)
      .attr("onmouseover", "app.widget('openDetailPopup', this)")
      .attr("onmouseout", "app.widget('closeDetailPopup', this, event)")
      .attr("class", "detailsRect");

    nodeEnter.append("g") // Create a detail popup group with a rectangle in it
      .attr("idr", function(d) {return `popupGroup${d.data.id}`})
      .attr("class", "detailPopupHidden")
      .attr("onmouseout", "app.widget('closeDetailPopup', this, event)")
      .append("rect")                                             // Large popup rectangle...
        .attr("idr", function(d) {return`popupRect${d.data.id}`})
        .attr("class", "detailPopup")
      .select(function() { return this.parentNode; })
        .append("rect")                                           // Header rectangle
        .attr("idr", function (d) {return `detailHeader${d.data.id}`})
        .attr("class", "detailHeader")
        .attr("height", this.getAttribute("nodeHeight"))
        .attr("width", this.getAttribute("popupWidth"))
      .select(function() { return this.parentNode; })
        .append("rect")                                           // disassociate button
        .attr("idr", function(d) {return `disassociate${d.data.id}`})
        .attr("class", "disassociateButton")
        .attr("height", this.getAttribute("nodeHeight"))
        .attr("width", this.getAttribute("nodeHeight"))
        .attr("onmousedown", "app.widget('disassociate', this)")
      .select(function() { return this.parentNode; })             // disassociate text
        .append("text")
        .attr("dx", function(d) {return `-${d.data.instance.detailWidth + d.data.instance.popupWidth - d.data.instance.nodeHeight/2}`;})
        .attr("idr", function(d) {return `disassociateText${d.data.id}`;})
        .attr("class", "disassociateText unselectable")
        .text("X")
      .select(function() { return this.parentNode; })
        .append("rect")                                           // Show Node button
        .attr("idr", function(d) {return `showNode${d.data.id}`})
        .attr("class", "showNodeButton")
        .attr("height", this.getAttribute("nodeHeight"))
        .attr("width", this.getAttribute("nodeHeight"))
        .attr("onmousedown", "app.widget('showNode', this)")
      .select(function() { return this.parentNode; })             // Show Node text
        .append("text")
        .attr("dx", function(d) {return `-${d.data.instance.detailWidth + d.data.instance.nodeHeight/2}`;})
        .attr("idr", function(d) {return `showNodeText${d.data.id}`;})
        .attr("class", "showNodeText unselectable")
        .text("+")
      .select(function() {return this.parentNode; })
        .append("text")                                           // Text in header
        .attr("dx", function(d) {return `-${d.data.instance.popupWidth/2 + d.data.instance.detailWidth}`;})
        .attr("class", "detailHeaderText unselectable")
        .attr("idr", function(d) {return `detailHeaderText${d.data.id}`})
      	.text(function(d) { return `Name: ${d.data.name} Type: ${d.data.type}`; });

    nodeEnter.append("text") // Add text
    	.attr("dx", this.getAttribute("nodeWidth")/2)
      .attr("dy", this.getAttribute("nodeHeight")/2 + 6)
      .attr("class", "nodeText unselectable")
      .attr("idr", function(d) {return `text${d.data.id}`})
    	.text(function(d) { return d.data.name; });

    nodeEnter.selectAll(".toggleRect") // For each toggle rectangle in new nodes...
      .classed("childrenVisibleToggle", function(d) {if (d.data.children && d.data.children.length>0) return true; else return false;}) // Set the appropriate class
      .classed("childrenHiddenToggle", function(d) {if (d.data._children && d.data._children.length>0) return true; else return false;})
      .classed("noChildrenToggle", function(d) {if ((!d.data.children || d.data.children.length==0)
                                                && (!d.data._children || d.data._children.length==0))
                                                return true; else return false;});

    nodeEnter.selectAll(".detailsRect") // For each detail rectangle in new nodes...
      .classed("detailWithNode", function(d) {if (d.data.nodeID) return true; else return false;}) // Set the appropriate class
      .classed("detailNoNode", function(d) {if (d.data.nodeID) return false; else return true;})

    nodeEnter.selectAll(".detailPopup")
      .attr("width", this.getAttribute("popupWidth"))
      // This is fairly complicated. It allots one line (of height nodeHeight) for each entry in the details object,
      // plus an additional line for the node's name and type.
      .attr("height", function(d) {return (d.data.details.length + 1) * d.data.instance.nodeHeight;})
      .attr("transform", function(d) {return `translate(-${d.data.instance.detailWidth + d.data.instance.popupWidth}
                                                        -${d.data.details.length * d.data.instance.nodeHeight})`;});

    nodeEnter.selectAll(".detailHeader")
      .attr("transform", function(d) {return `translate(-${d.data.instance.detailWidth + d.data.instance.popupWidth}
                                                        -${d.data.details.length * d.data.instance.nodeHeight})`});

    nodeEnter.selectAll(".disassociateButton")
      .attr("transform", function(d) {return `translate(-${d.data.instance.detailWidth + d.data.instance.popupWidth}
                                                        -${d.data.details.length * d.data.instance.nodeHeight})`});

    nodeEnter.selectAll(".disassociateText").attr("dy", function(d) {return -1*(d.data.details.length * d.data.instance.nodeHeight - 20);});

    nodeEnter.selectAll(".showNodeButton")
      .attr("transform", function(d) {return `translate(-${d.data.instance.detailWidth + d.data.instance.nodeHeight}
                                                        -${d.data.details.length * d.data.instance.nodeHeight})`});

    nodeEnter.selectAll(".showNodeText").attr("dy", function(d) {return -1*(d.data.details.length * d.data.instance.nodeHeight - 20);});

    nodeEnter.selectAll(".detailHeaderText")
      .text(function(d) { return `Name: ${d.data.name} Type: ${d.data.type}`; })
      .attr("dy", function(d) {return -d.data.instance.nodeHeight * (d.data.details.length - 0.5) + 6});

    if (node._enter) {
      nodeEnter.each(buildPopup);
    }

    node.selectAll(".toggleRect") // For each toggle rectangle in old nodes (may need updating)
      .classed("childrenVisibleToggle", function(d) {if (d.data.children && d.data.children.length>0) return true; else return false;}) // Set the appropriate class
      .classed("childrenHiddenToggle", function(d) {if (d.data._children && d.data._children.length>0) return true; else return false;})
      .classed("noChildrenToggle", function(d) {if ((!d.data.children || d.data.children.length==0)
                                                && (!d.data._children || d.data._children.length==0))
                                                return true; else return false;});

    node.selectAll(".detailsRect") // For each detail rectangle in old nodes (may need updating)...
      .classed("detailWithNode", function(d) {if (d.data.nodeID) return true; else return false;}) // Set the appropriate class
      .classed("detailNoNode", function(d) {if (d.data.nodeID) return false; else return true;})

    node.selectAll(".detailPopupVisible")
      .attr("class", "detailPopupHidden"); // If any popup happened to still be visible, hide it on the update

    node.selectAll(".detailPopup")
      .attr("width", this.getAttribute("popupWidth"))
      // This is fairly complicated. It allots one line (of height nodeHeight) for each entry in the details object,
      // plus an additional line for the node's name and type.
      .attr("height", function(d) {return (d.data.details.length + 1) * d.data.instance.nodeHeight;})
      .attr("transform", function(d) {return `translate(-${d.data.instance.detailWidth + d.data.instance.popupWidth}
                                                        -${d.data.details.length * d.data.instance.nodeHeight})`;});

    node.selectAll(".detailHeader")
      .attr("transform", function(d) {return `translate(-${d.data.instance.detailWidth + d.data.instance.popupWidth}
                                                        -${d.data.details.length * d.data.instance.nodeHeight})`});

    node.selectAll(".disassociateButton")
      .attr("transform", function(d) {return `translate(-${d.data.instance.detailWidth + d.data.instance.popupWidth}
                                                        -${d.data.details.length * d.data.instance.nodeHeight})`});

    node.selectAll(".disassociateText").attr("dy", function(d) {return -1*(d.data.details.length * d.data.instance.nodeHeight - 20);});

    node.selectAll(".showNodeButton")
      .attr("transform", function(d) {return `translate(-${d.data.instance.detailWidth + d.data.instance.nodeHeight}
                                                        -${d.data.details.length * d.data.instance.nodeHeight})`});

    nodeEnter.selectAll(".showNodeText").attr("dy", function(d) {return -1*((d.data.details.length) * d.data.instance.nodeHeight - 20);});

    node.selectAll(".detailHeaderText")
      .text(function(d) { return `Name: ${d.data.name} Type: ${d.data.type}`; })
      .attr("dy", function(d) {return -d.data.instance.nodeHeight * (d.data.details.length - 0.5) + 6});

    node.each(buildPopup);


    // Update text
    d3.selectAll(".node").each(function(d) { // For each node
      d3.select(this).select('.nodeText')  // Should select the text of the node
      .text(function(d) {return d.data.name}); // Should update the text
    });

    node.exit().remove();

    // Update the links…
    const link = g.selectAll("path.link")
      .data(links);

    link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("idr", function(d) {return `link${d.source.data.id}to${d.target.data.id}`; })
      .merge(link)
        .attr("d", d3.linkHorizontal()
          .x(function(d) { return d.y; })
          .y(function(d) { return d.x; })
          .source(function(d) { return {x: d.source.x + 15, y: d.source.y + 120}; })
          .target(function(d) { return {x: d.target.x + 15, y: d.target.y}; }))
        .attr("transform", "translate(0 0)");

      g.selectAll("path.link")
        .attr("idr", function(d) {return `link${d.source.data.id}to${d.target.data.id}`; })
      link.exit().remove();
  }

  lookForEnter(input, evnt) { // Makes hitting enter do the same thing as blurring (inserting a new node or changing an existing one)
    if (evnt.keyCode === 13) {
      input.onblur();
    }
  }

  saveInput(edit) {
    if (this.newNode) { // This SHOULD only run when there's a new node, but it doesn't hurt to check
      const newObj = this.getObjFromID(this.newNode);
      newObj.name = edit.value;
      this.newNode = null;
    }
    // Even if there is no new object, hide and move the edit text box and refresh
    edit.hidden = true;
    edit.value = "";
    edit.setAttribute("style", "position:static");
    this.SVG_DOM.appendChild(edit);
    this.update();
  }

  toggle(button) { // Toggle children.
    const node = button.parentElement;
    const d = node.__data__;


    if (d.data.children) {
      // First, if the edit textbox is visible and attached to one of the node's children, blur it.
      if (this.newNode) { // this.newNode is true when a node has just been created and the edit box hasn't been blurred yet
        let label = this.getObjFromID(this.newNode);
        let descendant = false;
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
          this.editDOM.blur();
        }
      }

  	  d.data._children = d.data.children;
  	  d.data.children = null;
    }
    else {
  	  d.data.children = d.data._children;
  	  d.data._children = null;
    }
    this.update();
  }

  openDetailPopup(button) {
    const group = button.parentElement;
    const ID = group.getAttribute("idr").slice(5); // the IDR will be like groupxxx

    // Look for an existing popup for this node (there should be one). If found, just make it visible and update its location.
    let popup = app.domFunctions.getChildByIdr(group, `popupGroup${ID}`);
    if (popup) {
      const node = popup.parentElement;
      const tree = node.parentElement;
      node.appendChild(popup); // Make the popup top in its node group...
      tree.appendChild(node); // and the node top in its tree...
      this.SVG_DOM.appendChild(tree); // and the tree top in the SVG.

      popup.setAttribute("class", "detailPopupVisible");
    }
  }

  closeDetailPopup(element, evnt) { // The element triggering this will be either the popup itself, or the popup rectangle.
    const x = evnt.clientX;
    const y = evnt.clientY;

    let ID = "";
    if (element.classList.contains("detailsRect")) { // If the triggering element was the popup rectangle...
      const group = element.parentElement;
      ID = group.getAttribute("idr").slice(5); // the IDR will be like groupxxx
      const obj = this.getObjFromID(ID);
      const popup = app.domFunctions.getChildByIdr(this.SVG_DOM, `popupGroup${obj.id}`);
      const popupBound = popup.getBoundingClientRect();
      const inPopup = popupBound.left <= x && x <= popupBound.right && popupBound.top <= y && y <= popupBound.bottom;
      if (!inPopup) {
        popup.setAttribute("class", "detailPopupHidden");
      }
    }
    else { // If the triggering event was the popup
      ID = element.getAttribute("idr").slice(10); // A popup's IDR is like popupGroupxxx.
      const obj = this.getObjFromID(ID);
      const button = app.domFunctions.getChildByIdr(this.SVG_DOM, `detail${obj.id}`);
      const buttonBound = button.getBoundingClientRect();
      const inButton = buttonBound.left <= x && x <= buttonBound.right && buttonBound.top <= y && y <= buttonBound.bottom;

      // Apparently, mousing over stuff IN the popup counts as mousing OUT of the popup, so I need to verify that hasn't happened.
      const popupBound = element.getBoundingClientRect();
      const inPopup = popupBound.left < x && x < popupBound.right && popupBound.top < y && y < popupBound.bottom;
      if (!inButton && !inPopup) {
        element.setAttribute("class", "detailPopupHidden");
      }
    }
  }

  showNode(button) {
    const data = button.parentElement.parentElement.__data__.data;
    const id = data.nodeID;
    const type = data.type;

    if (type == 'mindmap') {
      new widgetSVG(this.widgetID, id);
    }
    else if (type == "calendar") {
      new widgetCalendar(this.widgetID, id);
    }
    else {
      new widgetNode(this.widgetID, type, id);
    }
  }

  disassociate(button) {
    // Get object
    const ID = button.getAttribute("idr").slice(12); // This IDR will be like "disassociatexxx"
    const obj = this.getObjFromID(ID);
    // reset node ID, type and details
    obj.nodeID = null;
    obj.type = "";
    obj.details = [];

    this.update();
  }
}
