class widgetSVG {
  constructor (button, id) { // create variables, then call buildWidget(id)
    this.widgetID = app.idCounter;
    this.graphicID = id;
    this.SVG_DOM = null;
    this.widgetNode = document.getElementById(app.domFunctions.widgetGetId(button));

    const table = app.domFunctions.getChildByIdr(this.widgetNode, "nodeTable");
    this.nameCell = table.getElementsByTagName("TH")[0].nextElementSibling;

    app.widgets[app.idCounter] = this;
    this.width = 1200; // Width of the SVG element
    this.height = 300; // Height of the SVG element

    // constants for drawing
    this.nodeWidth = 150;
    this.nodeHeight = 30;

    // variables for dragging
    this.activeNode = null;
    this.currentX=0;
    this.currentY=0;
    this.transform = [0,0];

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
    const query = `match (graphic:graphic) where ID(graphic) = ${this.graphicID} and graphic.name = "${this.name}" return graphic.roots as roots`;
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
      const ID = data.nodeID;
      const name = data.name;

      const x = evnt.clientX;
      const y = evnt.clientY;
      const bound = svg.getBoundingClientRect();
      const top = bound.top;
      const left = bound.left;
      const relX = x-left;
      const relY = y-top;

      const rootObj = {};
      rootObj.x = relX;
      rootObj.y = relY;
      rootObj.id = data.nodeID;
      rootObj.name = name;
      rootObj.parent = "null";
      rootObj.children = [];
      this.roots.push(rootObj);
      this.update();
    }
  }

  dropConnect(node) { // Creates a link between the node being dragged and the node it was dropped onto
    const newChild = this.activeNode;
    this.activeNode = null;
    const parentID = node.getAttribute("idr").slice(5); // the IDR will be like groupxxx
    const childID = newChild.getAttribute("idr").slice(4); // And this IDR will be like treexxx

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

    // Get object representing parent node (may not be a root)
    let parentObj = null;
    let nonRootObjs = [];
    for (let i = 0; i < this.roots.length; i++) { // for every root...
      const root = this.roots[i];
      if (root.id == parentID) { // check that root...
        parentObj = root;
        break;
      }
      if (root.children) {
        nonRootObjs = nonRootObjs.concat(root.children); // then add its children to the list to check after roots
      }
    }

    while (nonRootObjs.length > 0 && parentObj == null) { // If the parent object hasn't been found and there are more objects to check...
      const testObj = nonRootObjs.pop(); // Grab an object and check it...
      if (testObj.id == parentID) {
        parentObj = testObj;
        break;
      }
      if (testObj.children) {
        nonRootObjs = nonRootObjs.concat(testObj.children); // then add its children to the list of objects to check.
      }
    }

    if (parentObj == null) {
      alert("Error: The parent object was not found.");
    }

    if (parentObj && childObj) { // If both objects were found
      const index = this.roots.indexOf(childObj); // Remove the child from the roots array
      if (index == -1) {
        alert("Error: The child object is not a root");
      }
      else {
        parentObj.children.push(childObj); // Make the child a child of the parent
        childObj.parent = parentObj.name; // Make the parent the child's parent
        delete childObj.x;
        delete childObj.y;

        this.roots.splice(index, 1);
      }

      this.update(); // Update the graphic
    } // End if (both objects found)
  }

  selectNode(element, evnt) { // When a group is clicked, records the current mouse position and the group's transformation, and sets onmousemove, onmouseup and onmouseout methods for dragging.
    // Because THIS is the closest SVG gets to a goddamn "Bring to front" command!
    // It just draws everything in whatever order it's listed in the DOM,
    // so to move something to the front you have to actually move the HTML that generates it forward!
    this.SVG_DOM.appendChild(element);

    this.activeNode = element;
    this.currentX = evnt.clientX; // get mouse position
    this.currentY = evnt.clientY;
    let transform = element.getAttribute("transform");
    this.transform = transform.slice(10, -1).split(' '); // Get the transformation string and extract the coordinates
    this.transform[0] = parseFloat(this.transform[0]);
    this.transform[1] = parseFloat(this.transform[1]);
    element.setAttribute("onmousemove", "app.widget('moveNode', this, event)");
    element.setAttribute("onmouseup", "app.widget('releaseNode', this, event)");
    element.setAttribute("onmouseout", "app.widget('releaseNode', this, event)");

    const widgetDOM = document.getElementById(this.id);
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
    element.setAttribute("transform", newTransform);
  }

  releaseNode(element, evnt) { // Removes all the onmousemove, onmouseup and onmouseout events which were set when the node was selected.
    element.removeAttribute("onmousemove");
    const x = evnt.clientX;
    const y = evnt.clientY;

    const rectangles = this.SVG_DOM.getElementsByTagName("rect"); // Get all rectangles in the graphic

    for (let i = 0; i < rectangles.length; i++) { // Loop through all rectangles
      const group=rectangles[i].parentElement;
      const bound = group.getBoundingClientRect(); // Get bounds of each rectangle
      const top = bound.top;
      const bottom = bound.bottom;
      const left = bound.left;
      const right = bound.right;
      const contains = element.contains(group);
      if (top < y && y < bottom && left < x && x < right && !contains ) { // If the mouse is inside this element, and this is NOT the element being dragged
        this.dropConnect(group);
      }
    }

    element.removeAttribute("onmouseup");
    element.removeAttribute("onmouseout");
  }

  save (button) { // Saves the current state of the graph to the database.
    let name = this.nameCell.firstElementChild.value;
    const id = this.graphicID;
    if (name == "" || !id || button.getAttribute("idr") == "saveAs") {  // If the graphic doesn't have a name or doesn't have an ID (indicating that it hasn't been saved),
                                                                        // or if the user clicked the "Save As" button, indicating they want to change the name, ask for a name.
      name = prompt("Please enter the name for this graphic", name);
    }
    const query = `merge (graphic: graphic {name:"${name}"}) with graphic set graphic.roots="${app.stringEscape(JSON.stringify(this.roots))}"`;

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
          .attr("transform", function(d) {return "translate(" + d.x + " " + d.y + ")";} )
          .attr("onmousedown", "app.widget('selectNode', this, event)")
          .attr("onmouseup", "app.widget('dropConnect', this, event)");
    newTrees.each(this.buildTree);
    groups.each(this.buildTree);
    groups.exit().remove();
  }

  // Builds an individual tree, given the data to build it from and the group to build it in.
  // Only called by update, which passes in the appropriate values for each tree.

  // NOTE: I don't know why yet, but it seems that when building a group for each tree, data is stored in d.
  // When building a node for each leaf WITHIN a tree (in buildTree), data is stored in d.data.
  buildTree(datum, index, group) {
    var tree = d3.tree()
    	.nodeSize([50, 200]);

    var root = d3.hierarchy(datum);
    var nodes = root.descendants();

    var links = tree(root).links();

    // Update the nodes…
    var g = d3.select(this);
    var node = g.selectAll(".node") // This means that all the nodes inside the given group are part of this tree
     .data(nodes, function(d) {return d.id || d.data.id;}) // Update what data to include..
     .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

    // Enter any new nodes
    var nodeEnter = node.enter().append("g") // Append a "g" for each new node
  	  .attr("class", "node")
  	  .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
  	  .attr("onclick", "app.widget('click', this)")
      .attr("idr", function (d) {return `group${d.data.id}`; });

    nodeEnter.append("rect")
      .attr("width", this.getAttribute("nodeWidth"))
      .attr("height", this.getAttribute("nodeHeight"))
      .attr("idr", function (d) {return `node${d.data.id}`; })
      .attr("class", "nodeRect");

    nodeEnter.append("text") // Add text
    	.attr("dx", this.getAttribute("nodeWidth")/2)
    	.attr("dy", this.getAttribute("nodeHeight")/2 + 6)
    	.text(function(d) { return d.data.name; })

    node.exit().remove;

    // Update the links…
    var link = g.selectAll("path.link")
      .data(links);

    link.enter().insert("path", "g")
        .attr("class", "link")
      .merge(link)
        .attr("d", d3.linkHorizontal()
          .x(function(d) { return d.y; })
          .y(function(d) { return d.x; })
          .source(function(d) { return {x: d.source.x + 15, y: d.source.y + 120}; })
          .target(function(d) { return {x: d.target.x + 15, y: d.target.y}; }));
      link.exit().remove();
  }

  click(node) { // Toggle children on click.
    d = node.__data__;
    if (d.data.children) {
  	d.data._children = d.data.children;
  	d.data.children = null;
    } else {
  	d.data.children = d.data._children;
  	d.data._children = null;
    }
    update();
  }
}
