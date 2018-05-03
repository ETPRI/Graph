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

    // variables for dragging
    this.currentX=0;
    this.currentY=0;
    this.transform = [];

    // data for making trees. This will hold an array of objects.
    // each with a name, a parent (although the parent will be null), x and y coordinates and a children array, as well as other data not needed for a tree.
    // The children array will include other objects making a tree.
    this.roots = [];

    this.buildWidget();
  } // end constructor

  buildWidget() { // create blank graphic, then if an ID was passed in, call loadGraphic
    this.name = this.nameCell.firstElementChild.value; // Check the input in the name cell of the table to get the graphic's name.
    if (this.name == "") this.name = "Untitled graphic";  // If that's blank, call it "Untitled graphic".

    const html = app.widgetHeader() + `<b idr="name">${this.name}</b><input type="button" idr="save" value="Save" onclick="app.widget('save', this)">
                                       <input type="button" idr="saveAs" value="Save As" onclick="app.widget('save', this)"></div>
                                       <div><svg id="svg${this.widgetID}" width="${this.width}" height="${this.height}" ondragover="app.widget('allowDrop', this, event)" ondrop="app.widget('dropAdd', this, event)"</svg></div>`;

    const parent = document.getElementById('widgets');
    const child = parent.firstElementChild;
    const newWidget = document.createElement('div'); // create placeholder div
    parent.insertBefore(newWidget, child); // Insert the new div before the first existing one
    newWidget.outerHTML = html; // replace placeholder with the div that was just written
    this.SVG_DOM = document.getElementById(`svg${this.widgetID}`);

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
      this.roots = JSON.parse(data[0].roots);
      this.count = data[0].count;
      this.update();
    }
  }

  allowDrop(object, evnt) { // Prevent default action so drag and drop works properly.
    evnt.preventDefault();
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
      const group = this.checkDrop(null, x, y);
      if (group) {
        this.dropConnect(group, newObj);
      }
      else {
        this.roots.push(newObj);
        this.update();
      }
    }
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
      const index = this.roots.indexOf(childObj); // Remove the child from the roots array if it's in there
      if (index != -1) {
        this.roots.splice(index, 1);
      }

      // Make the child a child of the parent
      if (parentObj.children) {
        parentObj.children.push(childObj);
      }
      else if (parentObj._children) {
        parentObj._children.push(childObj);
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
  }

  releaseNode(element, evnt) { // Removes all the onmousemove, onmouseup and onmouseout events which were set when the node was selected.
    const x = evnt.clientX;
    const y = evnt.clientY;

    const group = this.checkDrop(element.parentElement, x, y); // checkDrop returns the first other group (not element) it finds at the mouse coordinates (x and y), or null if there is no such group.
    if (group) { // If there is another group at the mouse coordinates, then we dropped element (the node being moved) onto that group, so we should connect them.
      const newChild = element.parentElement;
      const childID = newChild.getAttribute("idr").slice(4); // this IDR will be like treexxx

      // Get object representing child's root (from roots array)
      let childObj = null;
      for (let i = 0; i < this.roots.length; i++) {
        const root = this.roots[i];
        if (root.id == childID) {
          childObj = root;
          break;
        }
      }
      if (childObj == null) {
        alert("Error: The child object was not found.");
      }
      else this.dropConnect(group, childObj);
    } // end if (the node was dragged onto another node)

    element.removeAttribute("onmousemove");
    element.removeAttribute("onmouseup");
    element.removeAttribute("onmouseout");
  }

  checkDrop(element, x, y) {
    const rectangles = this.SVG_DOM.getElementsByTagName("rect"); // Get all rectangles in the graphic

    for (let i = 0; i < rectangles.length; i++) { // Loop through all rectangles
      const group=rectangles[i].parentElement;
      const bound = group.getBoundingClientRect(); // Get bounds of each rectangle
      const top = bound.top;
      const bottom = bound.bottom;
      const left = bound.left;
      const right = bound.right;
      let contains = false;
      if (element) {
        contains = element.contains(group);
      }

      if (top < y && y < bottom && left < x && x < right && !contains ) { // If the mouse is inside this element, and this is NOT the element being dragged or that element doesn't exist
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
    let descendantObjs = nodeObj.children.slice(); // To list the node's descendants, start with its children. slice makes a shallow copy.
    while (descendantObjs.length > 0) {
      const currentObj = descendantObjs.pop(); // Grab a descendant object...
      const descendantSVG = app.domFunctions.getChildByIdr(this.SVG_DOM, `group${currentObj.id}`); // Get the node associated with that object
      const linkSVG = app.domFunctions.getChildByIdr(this.SVG_DOM, `link${currentObj.parent}to${currentObj.id}`); // Get the line linking that object to its parent
      this.elemsToMove.push(descendantSVG);
      this.elemsToMove.push(linkSVG);  // Add them both to the list of things to move
      descendantObjs = descendantObjs.concat(currentObj.children); // Add the descendant's children to the array of descendants
    }
    // At this point, should have a complete array of items to move stored in this.elemsToMove, accessible from any method.

    this.currentY = evnt.clientY; // I'm only interested in vertical motion

    // For every item in elemsToMove, extract the current transform. Store in a 2D array where the first subscript represents the object and the second represents the coordinate (x or y).
    for (let i = 0; i < this.elemsToMove.length; i++) {
      const transform = this.elemsToMove[i].getAttribute("transform");
      if (transform) {
        this.transform[i] = transform.slice(10, -1).split(' '); // Get the transformation string and extract the coordinates
      }
      else {
        this.transform[i] = ["0","0"];
      }
      this.transform[i][0] = parseFloat(this.transform[i][0]); // I do need the original x in order to rewrite the transform later
      this.transform[i][1] = parseFloat(this.transform[i][1]);
    }

    element.setAttribute("onmousemove", "app.widget('moveChild', this, event)");
    element.setAttribute("onmouseup", "app.widget('releaseChildRearrange', this, event)");
    element.setAttribute("onmouseout", "app.widget('releaseChildSnapBack', this, event)");
  }

  moveChild(element, evnt) {
    // Get amount of mouse movement, and update mouse position
    const dy = evnt.clientY - this.currentY; // Still only interested in vertical motion
    this.currentY = evnt.clientY;

    // Move everything vertically
    for (let i = 0; i < this.elemsToMove.length; i++) {
    this.transform[i][1] += dy;
    const newTransform = `translate(${this.transform[i][0]} ${this.transform[i][1]})`;
    this.elemsToMove[i].setAttribute("transform", newTransform);
    }

  }

  releaseChildSnapBack(element, evnt) {
    element.removeAttribute("onmousemove");
    element.removeAttribute("onmouseup");
    element.removeAttribute("onmouseout");
    this.update();
  }

  releaseChildRearrange(element, evnt) {
    const elementY = this.transform[0][1]; // The first row in the transform array represents the element being dragged, and its second value represents the y-coordinate
    const nodeID = element.getAttribute("idr").slice(5); // the IDR will be like groupxxx
    const elementObj = this.getObjFromID(nodeID);
    const parentObj = this.getObjFromID(elementObj.parent); // Get the parent object
    const siblings = parentObj.children; // List of all the element's siblings (and itself). This should be an alias for the children array, not a new array - changes should affect the parent object.
    const currentPos = siblings.indexOf(elementObj); // This should be the element's current location in the siblings array
    siblings.splice(currentPos, 1); // Remove the element from its current position

    let yTransforms = []; // Array of the y transforms of each sibling element, starting with the first (highest). Remember that in SVG, high points have LOW y-coordinates.
    for (let i = 0; i < siblings.length; i++) {
      const sibNode = app.domFunctions.getChildByIdr(this.SVG_DOM, `group${siblings[i].id}`); // Get the DOM element representing the current sibling
      let transform = sibNode.getAttribute("transform");
      transform = transform.slice(10, -1).split(' '); // Get its transform string and extract the x and y values
      yTransforms[i] = parseFloat(transform[1]); // Parse the y-value of the transform as a float and store it in yTransforms
    }
    // When this loop finishes, the yTransforms array should be finished

    let found = false; // flag to tell whether the new position of the element has been found

    for (let i = 0; i < siblings.length; i++) {
      if (elementY < yTransforms[i]) {  // If the element being dragged ended up HIGHER than this one, then it should come before this one in the array.
        found = true; // flag that the position has been found
        siblings.splice(i, 0, elementObj); // Put the element back in at position i (moving the object that was already there down one).
        break;
      } // end if (position was found)
    } // end for (all siblings)

    if (!found) { // If the current position is NOT higher than any sibling, then this element should be last.
      siblings.push(elementObj); // Add it back at the end of the array
    }

    // At this point the parent's children array should be reordered, so all that's left to do is remove unneeded mouse functions and update the graphic.
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
    // Old code: just stored a copy of all the trees
    // let rootsCopy = JSON.parse(JSON.stringify(this.roots));
    //
    // for (let i=0; i< rootsCopy.length; i++) { // Go through all the roots and add their transform values to their coordinates, so they'll display in the right places.
    //     let root = rootsCopy[i];
    //     const id = root.id;
    //     const group = app.domFunctions.getChildByIdr(this.SVG_DOM, `tree${id}`);
    //     const transform = group.getAttribute("transform").slice(10, -1).split(' '); // Get the transformation string and extract the coordinates
    //     root.x = parseFloat(transform[0]);
    //     root.y = parseFloat(transform[1]);
    // }
    //
    // const query = `merge (graphic:graphic {name:"${name}"}) with graphic set graphic.roots="${app.stringEscape(JSON.stringify(rootsCopy))}", graphic.count = ${this.count}`;

    // Erase any links the graphic already has, and any relation nodes it linked to
    let query = `merge (graphic:graphic {name:"${name}"}) with graphic optional match (graphic)-[]-(rel:graphicRelation) detach delete rel
                 with graphic optional match (graphic)-[r]-() delete r`;

    // For each root object, store the x- and y- coordinates for the transform in an object, and create a relation from the graphic DB node to the node DB node storing that object.
    for (let i = 0; i < this.roots.length; i++) {
      let coords = {}; // create an object to store the root's coordinates
      // Set the coordinates to the (current) transform values, so the root will display in the right place.
      let root = this.roots[i];
      const id = root.id;
      const group = app.domFunctions.getChildByIdr(this.SVG_DOM, `tree${id}`);
      const transform = group.getAttribute("transform").slice(10, -1).split(' '); // Get the transformation string and extract the coordinates
      coords.x = parseFloat(transform[0]);
      coords.y = parseFloat(transform[1]);
      query += ` with graphic match (root) where ID(root) = ${root.nodeID} create (graphic)-[:Root {coords: ${JSON.stringify(coords)}}]->(root)`; // Create the relation
    }
    // For each relation, create a new "graphRelation" node with a "owned" link to the graph, a "parent" link and a "child" link, and a number stating the order of the children.
    // Example statement:
    // merge (n:graphic {name: "Positions"}) with n match (me:people {name: "Amy Fiori"}) match (mom:people {name: "Malinda McMillan"})
    // create (n)-[:Owner]->(rel:graphicRelation)-[:Parent]->(mom) with rel create (rel)-[:Child]->(me)
    let potentialParents = JSON.parse(JSON.stringify(this.roots)); // Easy way to make a copy
    while (potentialParents.length > 0) { // For every node (because they each might be a parent)
      const parent = potentialParents.pop();
      let children = [];
      let visible = true;

      if (parent.children) { // If the parent has visible children, use them as its children list
        children = parent.children;
      }
      else if (parent._children) { // If the parent has invisible children, use them as the children list, and remember that they're invisible
        children = parent._children;
        visible = false;
      }

      for (let i = 0; i < children.length; i++) { // for every child the parent has
        query += ` with graphic match (child) where ID(child) = ${children[i].nodeID} match (parent) where ID(parent) = ${parent.nodeID}
                  create (graphic)-[:Owner]->(rel:graphicRelation {visible: "${visible}", order: ${i}})-[:Parent]->(parent)
                  with rel, graphic, child create (rel)-[:Child]->(child)`; // Add a relation node to the graph, linked to the graphic, parent and child
        potentialParents.push(child); // add the child to the list of potential parents
      } // end for (every child of a given node)
    } // end while (there are nodes which haven't been searched for children)

// Example so far
// merge (graphic:graphic {name:"Positions"})
// with graphic optional match (graphic)-[]-(rel:graphRelation) detach delete rel
// with graphic match (graphic)-[r]-() delete r
// with graphic match (root) where ID(root) = 11 create (graphic)-[:Root {coords: "momTest"}]->(root)
// with graphic match (root) where ID(root) = 127 create (graphic)-[:Root {coords: "BKTest"}]->(root)
// with graphic match (child) where ID(child) = 9 match (parent) where ID(parent) = 11
// create (graphic)-[:Owner]->(rel:graphicRelation {visible: "true", order: 0})-[:Parent]->(parent)
// with rel, graphic create (rel)-[:Child]->(child)
// with graphic match (child) where ID(child) = 10 match (parent) where ID(parent) = 11
// create (graphic)-[:Owner]->(rel:graphicRelation {visible: "true", order: 1})-[:Parent]->(parent)
// with rel, graphic create (rel)-[:Child]->(child)

// THIS BLEW UP! I think I need to delete stuff separately from adding new stuff, because it wants to add the new stuff once for each thing that was deleted.


    app.db.setQuery(query);
    app.db.runQuery();
  }

  update() { // Creates a group for each item in the array of roots, then calls buildTree to make a tree for each group.
    let groups = d3.select("svg").selectAll("g.tree")
      .data(this.roots, function(d) {return d.name;});
    let newTrees = groups.enter()
        .append("g")
          .attr("class", "tree")
          .attr("idr", function(d) {return `tree${d.id}`})
          .attr("nodeWidth", this.nodeWidth)
          .attr("nodeHeight", this.nodeHeight)
          .attr("toggleWidth", this.toggleWidth)
          .attr("transform", function(d) {return "translate(" + d.x + " " + d.y + ")";} )
    newTrees.each(this.buildTree);
    groups.each(this.buildTree);
    groups.exit().remove();
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

    node.exit().remove();

    // Update the links…
    var link = g.selectAll("path.link")
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
