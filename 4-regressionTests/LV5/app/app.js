// import "module-name";
// import('./widgetList.js');
// import does not work yet, just include modules in index.js in "correct order"

// app.js holds the global functions and data for the application

class app { ///////////////////////////////////////////////////////////////// start class

// called once by app.html to create the one instance
constructor() {
	this.widgets   = {}; // store widgets as they are created, remove when closed
	this.idCounter = 0;  // init id counter - used get getElementById, is the id of the widget

	// used by class DB to access neo4j database
	this.authToken = neo4j.v1.auth.basic("neo4j", "paleo3i");
	this.driver    = neo4j.v1.driver("bolt://localhost", this.authToken, {encrypted:false});

	// Create instances of other classes needed to run the page
	this.metaData  			= new metaData();
	this.db        			= new db();
	this.domFunctions 	= new domFunctions();
	this.regression 		= new regressionTesting();
	this.login 					= new widgetLogin();

	// Add the regression header and login div to the list of widgets
	this.widgets.regressionHeader = this.regression;
	this.widgets.loginDiv = this.login;

	this.activeWidget = null; // widget being dragged
}

// relationAddEdit(){
// 	this.db.setQuery( `match (s) where id(s)=${document.getElementById('relationStart').value}
// 	                   match(e)  where id(e)=${document.getElementById('relationEnd').value}
// 										 create (s)-[:directed {comment: "${document.getElementById('relationComment').value}"}]->(e)` );
// 	this.db.runQuery(this,"relationCreate");
// }
//
// relationCreate(){
// 	alert("create Relation")
// }

// Takes a DOM element inside a widget, a method, and a set of arguments for that method.
// Finds the widget OBJECT associated with the widget that the DOM element is inside,
// then calls that method, belonging to that widget, with the original DOM element as the first argument,
// and the list of args as the remaining arguments
widget(method, widgetElement, ...args) { // args takes all the remaining arguments and stores them in an array
	// Get the ID of the widget that the DOM element is inside.
	const id = this.domFunctions.widgetGetId(widgetElement);

	// If that ID is associated with a widget object which contains the given method...
	if (id && this.widgets[id] && this.widgets[id][method]) {
		this.widgets[id][method](widgetElement, ...args); //  Call the method, and pass in widgetElement and any extra args
	} else {
     // Create an error message. This could stand to be more informative, but I'm not sure how best to write it.
		 alert(`App.widget: Error, method: ${method}`);
	}
}

// Runs when the page first loads. Gets the dropdown with ID "menuNodes", which starts off with just a placeholder value,
// and adds an option for every type of node listed in this.metadata.
menuNodesInit(){
	const menu = document.getElementById('menuNodes');
	const selectionTemplate = '<option value="#db#">#db#</option>'
	let html = "";  // build dropdown menu selections
	for (let nodeName in this.metaData.node) { // nodeName is the name of the node, like "people" or "Movie"
		html = selectionTemplate.replace(/#db#/g, nodeName); // Replaces the "#db" with nodeName
		const dropDown = document.createElement('option'); // Creates a new placeholder option...
		menu.appendChild(dropDown); // adds it to the menu...
		dropDown.outerHTML = html; // and replaces it with the version made from the selection template.
	}
}

// Runs when an item is chosen from the menu dropdown, or the New button is clicked.
// Creates a table of whatever type of node is selected on the dropdown (nothing happens if the placeholder is selected).
menuNodes(control) {
	// Get the value of the current selection in the dropdown list
	const dropDown = document.getElementById('menuNodes');
	const value = dropDown.options[dropDown.selectedIndex].value;

	// If the value was blank (the placeholder was selected) do nothing;
	// otherwise create a new widgetTableNodes object and store it in this.widgets.
	if (value==="") return;
	this.widgets[this.idCounter] = new widgetTableNodes(value, control.id);
}

// displays meta-data on nodes, keysNodes, relations, keysRelations, and all nodes that have been trashed.
// If the user is logged in, will also show them the nodes they, personally, have trashed, as well as their reasons.
menuDBstats(dropDown){
	// Get the value from the metadata dropdown.
	const value = dropDown.options[dropDown.selectedIndex].value;
	// If the value is blank (placeholder is selected) do nothing; else create a new widgetTableQuery and store in this.widgets.
	if (value==="") return;
	this.widgets[this.idCounter] = new widgetTableQuery(value, dropDown.id);
}

// Runs when the page loads. Ensures all preset calendars exist in the database.
presetCalendars() {
	// At the moment the only preset calendar is a dummy calendar that doesn't show events. This will change.
	const query = `merge (dummy:calendar {name: "dummy", description: "dummy calendar"})`;
	this.db.setQuery(query);
	this.db.runQuery();
}

// refresh widget with new database call. domElement is the search button that triggered the search.
widgetSearch(domElement) {
	// Get the ID of the widget that the search button was part of...
	const id = this.domFunctions.widgetGetId(domElement);
	this.widgets[id].searchTrigger = id;
	// then call that widget's search function.
	this.widgets[id].search();
}

// Returns HTML for a widget header, including an outer element to hold the entire widget
// (a div, unless something else is specified), an inner header div,
// and working close and expand/collapse buttons inside the header.
// Gives the widget an ID as specified by this.idCounter, and increments this.idCounter.
// Also gives the whole widget an ondrop and ondragover so that widgets can be dragged onto each other to rearrange them,
// and gives the header an ondragstart so that widget headers, and only the headers, can be dragged in this way.
// Does not close the header div or outer element.
widgetHeader(tag){
	if (!tag) {
		tag = "div";
	}
	return(`
	<${tag} id="${this.idCounter++}" class="widget" ondrop="app.drop(this, event)" ondragover="app.allowDrop(this, event)">
	<hr>
	<div idr="header" draggable="true" ondragstart="app.drag(this, event)">
	<input type="button" value="X" idr="closeButton" onclick="app.widgetClose(this)">
	<input type="button" value="__" idr="expandCollapseButton" onclick="app.widgetCollapse(this)">
		`)
}

// Expands or collapses a widget when the expand/collapse button in that widget is clicked.
// Also changes the text on the button back and forth between "__" and "+".
widgetCollapse(domElement) {
	const table=domElement.parentElement.parentElement.lastElementChild;
  // above code is brittle, it assumes position of table relative to button. Also assumes only one item (a table) needs hiding.
	// Currently: Button is in header which is in widget div (the grandparent). The last child of the widget div is the table.

	table.hidden = !table.hidden  // toggle hidden
	if(table.hidden) {
		domElement.value = "+";
	} else {
		domElement.value = 	"__";
	}

	// log
	const obj = {};
	obj.id = this.domFunctions.widgetGetId(domElement);
	obj.idr = domElement.getAttribute('idr');
	obj.action = "click";
	this.regression.log(JSON.stringify(obj));
	this.regression.record(obj);
}

// Called when a close button is clicked. widgetElement is the close button.
// Removes the widget that widgetElement is part of from the screen,
// and removes it and all widgets contained in it from this.widgets array.
// Relies on widgets which contain other widgets maintaining a list of contained widgets.
widgetClose(widgetElement) {
	// Get the ID of the widget to be closed
	const id = this.domFunctions.widgetGetId(widgetElement);

	// delete javascript instance of widgetTable
	let children = [];
	if (this.widgets[id].containedWidgets) { // Get the IDs of all widgets contained within this one.
		children = children.concat(this.widgets[id].containedWidgets)
	}
	delete this.widgets[id]; // Delete the original widget.

	while (children.length >0) {
		const child = children.pop(); // Grab a child widget...
		if (child.containedWidgets) { // Get the IDs of all widgets contained within it...
			children = children.concat(child.containedWidgets);
		}
		delete this.widgets[child]; 	// and delete it.
	}

	// delete html2 from page
	const widget = document.getElementById(id);
	widget.parentElement.removeChild(widget);

	// log
	const obj = {};
	obj.id = id;
	obj.idr = widgetElement.getAttribute("idr");
	obj.action = "click";
	this.regression.log(JSON.stringify(obj));
	this.regression.record(obj);
}

// Escapes special character in a string. Stringifying it and then removing the outer quotes is a good shortcut.
stringEscape(text) {
	let string = JSON.stringify(text);
	string = string.substring(1, string.length-1);
	return string;
}

// Removes the ID of every node and relation, including node IDs stored IN a relation as "start" and "end" values.
// Useful before recording for regression testing, because IDs are not consistent from playthrough to playthrough,
// so recording them means it's impossible to compare the results of two playthroughs and see if they're equal.
stripIDs (data) { // Assume that the data is the result of a query. Each row may include a node or relation whose IDs, start and end attributes need to be stripped.
	for (let i = 0; i < data.length; i++) { // for every row returned, which may include whole nodes or relations with any name
		for (let fieldName in data[i]) { // for every item in that row, which may BE a whole node or relation
			if ((data[i][fieldName] instanceof Object) && ('identity' in data[i][fieldName])) { // If that item is an object with an identity, delete it
				delete data[i][fieldName].identity;
			}
			if ((data[i][fieldName] instanceof Object) && ('start' in data[i][fieldName])) { // If that item has a "start", which is another node's identity, delete it
				delete data[i][fieldName].start;
			}
			if ((data[i][fieldName] instanceof Object) && ('end' in data[i][fieldName])) { // If that item has an "end", which is another node's identity, delete it
				delete data[i][fieldName].end;
			}
		}
	} // end for (every row)
}

// Called when the user clicks and drags a widget. Sets this.activeWidget (which records which widget, if any, is being dragged)
// to the widget that was clicked. Also stores information about the widget being dragged in dataTransfer.
drag(widget, evnt) {
	this.activeWidget = evnt.target;
	while (this.activeWidget.parentNode.id != "widgets") { // Make the active node being dragged the top-level widget that the target was in
		this.activeWidget = this.activeWidget.parentElement;
	}

	// Stores information about the item being dragged in dataTransfer
	const data = {};
	data.sourceID = this.domFunctions.widgetGetId(widget);
	data.sourceType = "widget";
	data.sourceTag = widget.tagName;
	evnt.dataTransfer.setData("text/plain", JSON.stringify(data));

	const obj = {};
	obj.id = this.domFunctions.widgetGetId(evnt.target);
	obj.action = "dragstart";
	this.regression.log(JSON.stringify(obj));
	this.regression.record(obj);
}

// Prevents the default action of a drop so that we can write our own ondrop methods.
allowDrop(input, evnt) {
	evnt.preventDefault();
}

// Used for rearranging. When something is dropped onto a widget, check to verify that it's another widget,
// then insert the widget that was dragged above (if dragging up) or below (if dragging down) the one it was dropped onto.
drop(widget, evnt) {
	evnt.preventDefault();

	// Get the data about the object being dragged
	const dataText = evnt.dataTransfer.getData("text/plain");
	const data = JSON.parse(dataText);

	if (data.sourceType == "widget" && data.sourceTag == "DIV") { // Make sure the object being dragged is a widget
		let target = evnt.target;

		// Make sure we're dropping into a top-level widget - one whose parent is the widgets div
		while (target.parentNode.id != "widgets") {
			target = target.parentNode;
		}

		if (this.activeWidget) { // If activeNode (the DOM element being dragged) exists
			if (this.activeWidget.offsetTop < target.offsetTop) {  // drag down
				target.parentNode.insertBefore(this.activeWidget, target.nextSibling); // Insert after target
			}
			else { // drag up
				target.parentNode.insertBefore(this.activeWidget, target); // Insert before target
			}
		}

		this.activeNode = null; // Nothing is actively being dragged anymore - the thing that was being dragged was dropped.

		const obj = {};
		obj.id = this.domFunctions.widgetGetId(evnt.target);
		obj.action = "drop";
		this.regression.log(JSON.stringify(obj));
		this.regression.record(obj);
	}
}

// Used for testing, UI can be hard coded here to reduce amount of clicking to test code.
// Can be called directly by app.html, or by clicking a single button. Currently empty.
test() {}
}  ///////////////////////////////////////////////////////////////// end class
