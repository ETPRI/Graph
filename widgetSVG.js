class widgetSVG {
  constructor (button, id) { // create variables, then call buildWidget(id)
    this.widgetID = app.idCounter;
    this.graphicID = id;
    this.SVG_DOM = null;
    this.widgetNode = document.getElementById(app.domFunctions.widgetGetId(button));

    const table = app.domFunctions.getChildByIdr(this.widgetNode, "nodeTable");
    this.nameCell = table.getElementsByTagName("TH")[0].nextElementSibling;

    app.widgets[app.idCounter] = this;
    this.count = 0;

    // constants for drawing
    this.width = 1200; // Width of the SVG element
    this.height = 300; // Height of the SVG element
    this.nodeWidth = 150;
    this.nodeHeight = 30;
    this.toggleWidth = 20;

    // variables for dragging and creating new nodes
    this.currentX=0;
    this.currentY=0;
    this.transform = [];
    this.parentNode = null;
    this.nextSibling = null;
    this.prevSibling = null;
    this.currentParent = null;

    // data for making trees. This will hold an array of objects.
    // each with a name, a parent (although the parent will be null), x and y coordinates and a children array, as well as other data not needed for a tree.
    // The children array will include other objects making a tree.
    this.roots = [];

    // used for creating new nodes and editing existing ones
    this.newNode = null;
    this.editDOM = null;

    this.buildWidget();
  } // end constructor

  buildWidget() { // create blank graphic, then if an ID was passed in, call loadGraphic
    this.name = this.nameCell.firstElementChild.value; // Check the input in the name cell of the table to get the graphic's name.
    if (this.name == "") this.name = "Untitled graphic";  // If that's blank, call it "Untitled graphic".

    const html = app.widgetHeader() + `<b idr="name">${this.name}</b><input type="button" idr="save" value="Save" onclick="app.widget('save', this)">
                                       <input type="button" idr="saveAs" value="Save As" onclick="app.widget('save', this)"></div>
                                       <div><svg id="svg${this.widgetID}" width="${this.width}" height="${this.height}" ondblclick="app.widget('doubleClick', this, event)"
                                       ondragover="app.widget('allowDrop', this, event)" ondrop="app.widget('dropAdd', this, event)"</svg></div></div>`;

    const parent = document.getElementById('widgets');
    const child = parent.firstElementChild;
    const newWidget = document.createElement('div'); // create placeholder div
    parent.insertBefore(newWidget, child); // Insert the new div before the first existing one
    newWidget.outerHTML = html; // replace placeholder with the div that was just written
    this.SVG_DOM = document.getElementById(`svg${this.widgetID}`);

    this.editDOM = document.createElement("input");
    this.editDOM.setAttribute("type", "text");
    this.editDOM.setAttribute("onblur", "app.widget('saveInput', this)");
    this.editDOM.setAttribute("onkeydown", "app.widget('lookForEnter', this, event)");
    this.editDOM.setAttribute("hidden", "true");
    this.editDOM.setAttribute("idr", "edit");
    this.SVG_DOM.appendChild(this.editDOM);


    if (this.graphicID) {
      this.loadGraphic();
    }
  } // end buildWidget

  loadGraphic () { // Call database to get the trees for this graphic and their locations, then call loadComplete().
    const query = `match (graphic:graphic) where ID(graphic) = ${this.graphicID} and graphic.name = "${this.name}" return graphic.roots as roots, graphic.count as count`;
    app.db.setQuery(query);
    app.db.runQuery(this, 'loadComplete');
  } // end load

  loadComplete(data) { // Sets the roots array for the graphic to match the data that was loaded, then calls update() to draw the graphic
    if (data.length == 0) {
      alert ("Error: graphic not found");
    }
    else if (data.length > 1) {
      alert ("Error: Multiple graphics found with same name");
    }
    else { // If one graphic was returned - which should always happen
      if (data[0].roots) {
        this.roots = JSON.parse(data[0].roots);
      }
      if (data[0].count) {
        this.count = data[0].count;
      }
      this.update();
    }
  }

  allowDrop(object, evnt) { // Prevent default action so drag and drop works properly. Also find parent and sibling nodes.
    evnt.preventDefault();
    this.highlightParent(evnt.clientX, evnt.clientY, null);
  }

  dropAdd (svg, evnt) { // Add node to the list of root nodes in the graphic and call update.
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
      newObj.parent = "null";
      newObj.children = [];

      // Right here, I should check whether I dropped ONTO something. If so, instead of adding the new node as a root, I should call dropConnect.
      // const group = this.checkDrop(null, x, y);
      if (this.parentNode) {
        this.dropConnect(this.parentNode, newObj);
      }
      else {
        this.roots.push(newObj);
        this.update();
      }
    }
  }

  doubleClick(element, evnt)  {
    // Get positioning information
    const x = evnt.clientX;
    const y = evnt.clientY;
    const bound = this.SVG_DOM.getBoundingClientRect();
    const top = bound.top;
    const left = bound.left;
    const relX = x-left;
    const relY = y-top;

    const box = this.checkDrop(null, relX, relY);
    if (box) {
      alert("Editing");
    }
    else {
      this.newBox(relX, relY);
    }
  }
  newBox(x, y) {
    // Create new object with no node associated
    const newObj = {};
    newObj.x = x;
    newObj.y = y;
    newObj.nodeID = null;
    newObj.id = this.count++;
    newObj.name = "";
    newObj.parent = "null";
    newObj.children = [];

    // Remember which node to edit
    this.newNode = newObj.id;

    this.roots.push(newObj);
    this.update();
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

      this.update(); // Update the graphic
    } // End if (both objects found)
  }

  selectNode(element, evnt) { // When a group is clicked, records the current mouse position and the group's transformation, and sets onmousemove, onmouseup and onmouseout methods for dragging.
    // Because THIS is the closest SVG gets to a goddamn "Bring to front" command!
    // It just draws everything in whatever order it's listed in the DOM,
    // so to move something to the front you have to actually move the HTML that generates it forward!
    this.SVG_DOM.appendChild(element.parentElement);

    this.currentX = evnt.clientX; // get mouse position
    this.currentY = evnt.clientY;
    const transform = element.parentElement.getAttribute("transform");
    this.transform = transform.slice(10, -1).split(' '); // Get the transformation string and extract the coordinates
    this.transform[0] = parseFloat(this.transform[0]);
    this.transform[1] = parseFloat(this.transform[1]);

    element.setAttribute("onmousemove", "app.widget('moveNode', this, event)");
    element.setAttribute("onmouseup", "app.widget('releaseNode', this, event)");
    element.setAttribute("onmouseout", "app.widget('releaseNode', this, event)");
  }

  moveNode (element, evnt) { // Compares current to previous mouse position to see how much the element should have moved, then moves it by that much and updates the mouse position.
    // Get amount of mouse movement, and update mouse position
    const dx = evnt.clientX - this.currentX;
    const dy = evnt.clientY - this.currentY;
    this.currentX = evnt.clientX;
    this.currentY = evnt.clientY;

    // Move the node group
    this.transform[0] += dx;
    this.transform[1] += dy;
    const newTransform = `translate(${this.transform[0]} ${this.transform[1]})`;
    element.parentElement.setAttribute("transform", newTransform);

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
    if (this.parentNode) { // If we dropped element (the node being moved) onto that group, we should connect them.
      const newChild = element;
      const childID = newChild.getAttribute("idr").slice(5); // this IDR will be like groupxxx

      // Get object representing child's root (from roots array)
      const childObj = this.getObjFromID(childID);
      if (childObj == null) {
        alert("Error: The child object was not found.");
      }
      else this.dropConnect(this.parentNode, childObj);
    } // end if (the node was dragged onto another node)

    else if (this.currentParent) { // if the node being dragged was a child, refresh the page so they snap back
      this.update();
    }

    // Remove mouse methods and ensure all drag variables are null
    element.removeAttribute("onmousemove");
    element.removeAttribute("onmouseup");
    element.removeAttribute("onmouseout");
    this.parent = null;
    this.nextSibling = null;
    this.prevSibling = null;
    if (this.currentParent) {
      this.currentParent.classList.remove("currentParent");
    }
    this.currentParent = null;
  }

  checkDrop(element, x, y) {
    const groups = this.SVG_DOM.getElementsByClassName("node"); // Get all rectangles in the graphic

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
    const groups = this.SVG_DOM.getElementsByClassName("node"); // Get all rectangles in the graphic

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
    const groups = this.SVG_DOM.getElementsByClassName("node"); // Get all rectangles in the graphic

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

  selectChild(element, evnt) {
    // Move the element to the front by reappending it where it was (SVG doesn't have 3D ordering, it just puts whatever was added last in front)
    element.parentElement.appendChild(element);

    // Get array of ALL SVG elements to move - this node, all its children and the lines connecting it to its children
    const nodeID = element.getAttribute("idr").slice(5); // the IDR will be like groupxxx
    const nodeObj = this.getObjFromID(nodeID); // Get the object representing this node
    this.elemsToMove = [element]; // A list of all elements that need to move. It starts with just the node being dragged.
    const descendantObjs = nodeObj.children.slice(); // To list the node's descendants, start with its children. slice makes a shallow copy.
    while (descendantObjs.length > 0) {
      const currentObj = descendantObjs.pop(); // Grab a descendant object...
      const descendantSVG = app.domFunctions.getChildByIdr(this.SVG_DOM, `group${currentObj.id}`); // Get the node associated with that object
      const linkSVG = app.domFunctions.getChildByIdr(this.SVG_DOM, `link${currentObj.parent}to${currentObj.id}`); // Get the line linking that object to its parent
      this.elemsToMove.push(descendantSVG);
      this.elemsToMove.push(linkSVG);  // Add them both to the list of things to move
      descendantObjs = descendantObjs.concat(currentObj.children); // Add the descendant's children to the array of descendants
    }
    // At this point, should have a complete array of items to move stored in this.elemsToMove, accessible from any method.

    this.currentY = evnt.clientY;
    this.currentX = evnt.clientX;

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

    const parentID = element.__data__.data.parent;
    this.currentParent = app.domFunctions.getChildByIdr(this.SVG_DOM, `group${parentID}`);
    this.currentParent.classList.add("currentParent");


    element.setAttribute("onmousemove", "app.widget('moveChild', this, event)");
    element.setAttribute("onmouseup", "app.widget('releaseNode', this, event)");
    element.setAttribute("onmouseout", "app.widget('releaseChildSnapBack', this, event)");
  }

  moveChild(element, evnt) {
    // Get amount of mouse movement, and update mouse position
    const dx = evnt.clientX - this.currentX;
    const dy = evnt.clientY - this.currentY;

    this.currentX = evnt.clientX;
    this.currentY = evnt.clientY;

    // Move everything vertically
    for (let i = 0; i < this.elemsToMove.length; i++) {
      this.transform[i][0] += dx;
      this.transform[i][1] += dy;
      const newTransform = `translate(${this.transform[i][0]} ${this.transform[i][1]})`;
      this.elemsToMove[i].setAttribute("transform", newTransform);
    }

    // highlight potential parents
    this.highlightParent(evnt.clientX, evnt.clientY, element);
  }

  releaseChildSnapBack(element, evnt) {
    element.removeAttribute("onmousemove");
    element.removeAttribute("onmouseup");
    element.removeAttribute("onmouseout");
    this.update();
  }

  save (button) { // Saves the current state of the graph to the database.
    let name = this.nameCell.firstElementChild.value;
    const id = this.graphicID;
    if (name == "" || !id || button.getAttribute("idr") == "saveAs") {  // If the graphic doesn't have a name or doesn't have an ID (indicating that it hasn't been saved),
                                                                        // or if the user clicked the "Save As" button, indicating they want to change the name, ask for a name.
      name = prompt("Please enter the name for this graphic", name);
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

    const query = `merge (graphic: graphic {name:"${name}"}) with graphic set graphic.roots="${app.stringEscape(JSON.stringify(rootsCopy))}", graphic.count = ${this.count}`;

    app.db.setQuery(query);
    app.db.runQuery();
  }

  update() { // Creates a group for each item in the array of roots, then calls buildTree to make a tree for each group.
    const groups = d3.select("svg").selectAll("g.tree")
      .data(this.roots, function(d) {return d.name;});
    if (groups._enter) {
      const newTrees = groups.enter()
        .append("g")
          .attr("class", "tree")
          .attr("idr", function(d) {return `tree${d.id}`})
          .attr("nodeWidth", this.nodeWidth)
          .attr("nodeHeight", this.nodeHeight)
          .attr("toggleWidth", this.toggleWidth)
          .attr("transform", function(d) {return "translate(" + d.x + " " + d.y + ")";} )
      newTrees.each(this.buildTree);
    }
    if (groups._groups) {
      groups.each(this.buildTree);
    }
    if (groups._exit) {
      groups.exit().remove();
    }

    // Finally, see if there's a new (blank) node. If so, append a text box to it to get the name, then make it NOT the new node anymore.
    if (this.newNode) {
      const newNode = app.domFunctions.getChildByIdr(this.SVG_DOM, `group${this.newNode}`);
      this.SVG_DOM.parentElement.appendChild(this.editDOM);
      this.editDOM.hidden=false;
      const bounds = newNode.getBoundingClientRect();
      this.editDOM.setAttribute("style", `position:absolute; left:${bounds.left}px; top:${bounds.top}px`);
      this.editDOM.focus();
    }
  }

  // Builds an individual tree, given the data to build it from and the group to build it in.
  // Only called by update, which passes in the appropriate values for each tree.

  // NOTE: I don't know why yet, but it seems that when building a group for each tree, data is stored in d.
  // When building a node for each leaf WITHIN a tree (in buildTree), data is stored in d.data.
  buildTree(datum, index, group) {
    const tree = d3.tree()
    	.nodeSize([50, 200]);

    const root = d3.hierarchy(datum);
    const nodes = root.descendants();

    const links = tree(root).links();

    // Update the nodes…
    const g = d3.select(this);
    const node = g.selectAll(".node") // This means that all the nodes inside the given group are part of this tree
     .data(nodes, function(d) {return d.id || d.data.id;}) // Update what data to include..
     .attr("transform", function(d) { return "translate(" + d.y + " " + d.x + ")"; });

    // Enter any new nodes
    const nodeEnter = node.enter().append("g") // Append a "g" for each new node
  	  .attr("class", "node")
  	  .attr("transform", function(d) { return "translate(" + d.y + " " + d.x + ")"; })
      .attr("idr", function (d) {return `group${d.data.id}`; })
      .attr("onmousedown", function(d) {
        if (d.data.parent == "null") return "app.widget('selectNode', this, event)";
        else return "app.widget('selectChild', this, event)";
      });

    nodeEnter.append("rect")
      .attr("width", this.getAttribute("nodeWidth"))
      .attr("height", this.getAttribute("nodeHeight"))
      .attr("idr", function (d) {return `node${d.data.id}`; })
      .attr("class", "nodeRect");

    nodeEnter.append("rect")
      .attr("width", this.getAttribute("toggleWidth"))
      .attr("height", this.getAttribute("nodeHeight"))
      .attr("idr", function(d) {return `toggle${d.data.id}`})
      .attr("transform", `translate(${this.getAttribute("nodeWidth")} 0)`)
      .attr("onmouseover", "app.widget('toggle', this)")
      .attr("class", "toggleRect");

    nodeEnter.append("text") // Add text
    	.attr("dx", this.getAttribute("nodeWidth")/2)
    	.attr("dy", this.getAttribute("nodeHeight")/2 + 6)
      .attr("class", "unselectable")
    	.text(function(d) { return d.data.name; });

    nodeEnter.selectAll(".toggleRect") // For each toggle rectangle
      .classed("childrenVisibleToggle", function(d) {if (d.data.children && d.data.children.length>0) return true; else return false;}) // Set the appropriate class
      .classed("childrenHiddenToggle", function(d) {if (d.data._children && d.data._children.length>0) return true; else return false;})
      .classed("noChildrenToggle", function(d) {if ((!d.data.children || d.data.children.length==0)
                                                && (!d.data._children || d.data._children.length==0))
                                                return true; else return false;});

    node.selectAll(".toggleRect") // For each toggle rectangle
      .classed("childrenVisibleToggle", function(d) {if (d.data.children && d.data.children.length>0) return true; else return false;}) // Set the appropriate class
      .classed("childrenHiddenToggle", function(d) {if (d.data._children && d.data._children.length>0) return true; else return false;})
      .classed("noChildrenToggle", function(d) {if ((!d.data.children || d.data.children.length==0)
                                                && (!d.data._children || d.data._children.length==0))
                                                return true; else return false;});

    // Update text
    d3.selectAll(".node").each(function(d) { // For each node
      d3.select(this).select('text')  // Should select the only text element in this node
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
  	  d.data._children = d.data.children;
  	  d.data.children = null;
    }
    else {
  	  d.data.children = d.data._children;
  	  d.data._children = null;
    }
    this.update();
  }
}
