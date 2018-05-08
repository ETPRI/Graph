// import "module-name";
// import('./widgetList.js');
// import does not work yet, just include modules in index.js in "correct order"

// app.js holds the global functions and data for the application

class app { ///////////////////////////////////////////////////////////////// start class

constructor() {
	// called once by app.js to create the one instance
	this.widgets   = {}; // store widgets as they are created, remove when closed
	this.idCounter = 0;  // init id counter - used get getElementById, is the id of the widget

	// used by classDB to access neo4j database,
	this.authToken = neo4j.v1.auth.basic("neo4j", "paleo3i");
	this.driver    = neo4j.v1.driver("bolt://localhost", this.authToken, {encrypted:false});

	this.metaData  			= new metaData();
	this.db        			= new db();
	this.domFunctions 	= new domFunctions();
	this.regression 		= new regressionTesting();
	this.login 					= new widgetLogin();

	this.widgets.regressionHeader = this.regression;
	this.widgets.loginDiv = this.login;

	this.activeWidget = null; // widget being dragged
}

relationAddEdit(){
	this.db.setQuery( `match (s) where id(s)=${document.getElementById('relationStart').value}
	                   match(e)  where id(e)=${document.getElementById('relationEnd').value}
										 create (s)-[:directed {comment: "${document.getElementById('relationComment').value}"}]->(e)` );
	this.db.runQuery(this,"relationCreate");
}

relationCreate(){
	alert("create Relation")
}

widget(method, widgetElement, ...args) { // SHOULD take all the remaining arguments and store them in an array
	// app.widget("add",this) on widget to get back to method from html to class
	const id = this.domFunctions.widgetGetId(widgetElement);
	if (id && this.widgets[id] && this.widgets[id][method]) {
		this.widgets[id][method](widgetElement, ...args); //  Call the method, which belongs to the widget containing widgetElement, and pass in widgetElement. SHOULD also pass in extra args
	} else {
     // create instance of widget and remember it
		 alert("App.widget: Error, method= "+ method);
	}
}

menuNodesInit(){
	const menu = document.getElementById('menuNodes');
	const selectionTemplate = '<option value="#db#">#db#</option>'
	let html = "";  // build dropdown menu selections
	for (let nodeName in this.metaData.node) { // nodeName is the name of the node, like "people" or "Movie"
		html = selectionTemplate.replace(/#db#/g, nodeName);
		const dropDown = document.createElement('option');
		menu.appendChild(dropDown);
		dropDown.outerHTML = html;
	}
}

menuNodes(control) {  // displays widgetTableNodes based on menu selection - nodes, allow search, add/edit
	const dropDown = document.getElementById('menuNodes');
	const value = dropDown.options[dropDown.selectedIndex].value;
	if (value==="") return;  // menu comment
	this.widgets[this.idCounter] = new widgetTableNodes(value, control.id);
}

/* displays meta-data on nodes, keysNodes, relations, keysRelations */
menuDBstats(dropDown){
	const value = dropDown.options[dropDown.selectedIndex].value;
	if (value==="") return; // menu comment
	this.widgets[this.idCounter] = new widgetTableQuery(value, dropDown.id);
}

presetCalendars() {
	const query = `merge (dummy:calendar {name: "dummy", description: "dummy calendar"})`;
	this.db.setQuery(query);
	this.db.runQuery();
}

// /* refresh widget with new database call */
widgetSearch(domElement) {
	// called from widgetList
	const id = this.domFunctions.widgetGetId(domElement);
	this.widgets[id].searchTrigger = id;
	this.widgets[id].search();
}

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

widgetCollapse(domElement) {  // toggle expand collapse
	// called from widgetList
	const table=domElement.parentElement.parentElement.lastElementChild;
  // above code is brittle, it assumes position of table relative to button. Currently: Button is in header which is in widget div (the grandparent). The last child of the widget div is the table.

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

widgetClose(widgetElement) {
	/* app.widgetClose(this)
	input - widgetElement
	action - removes widget from screen
	*/
	const id = this.domFunctions.widgetGetId(widgetElement);

	// delete javascript instance of widgetTable
	const children = [];
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

	// delete  html2 from page
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

stringEscape(text) {
	let string = JSON.stringify(text);
	string = string.substring(1, string.length-1);
	return string;
}

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

drag(widget, evnt) { // sets value of activeNode and data
	if (event.dataTransfer.getData("text/plain") == "") { // If there's not already data from something smaller being dragged
	this.activeWidget = evnt.target;
	while (this.activeWidget.parentNode.id != "widgets") { // Make the active node being dragged the top-level widget that the target was in
		this.activeWidget = this.activeWidget.parentElement;
	}

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
}

allowDrop(input, evnt) { // the event doesn't take its default action
	evnt.preventDefault();
}

drop(widget, evnt) {
	evnt.preventDefault();

	const dataText = evnt.dataTransfer.getData("text/plain");
	const data = JSON.parse(dataText);

	if (data.sourceType == "widget" && data.sourceTag == "DIV") { // Make sure the object being dragged is a widget
		let target = evnt.target;
		while (target.parentNode.id != "widgets") { // Make sure we're dropping into a top-level widget - one whose parent is the widgets div
			target = target.parentNode;
		}
		if (this.activeWidget) { // If activeNode exists
			if (this.activeWidget.offsetTop < target.offsetTop) {  // drag down
				target.parentNode.insertBefore(this.activeWidget, target.nextSibling); // Insert after target
			}
			else { // drag up
				target.parentNode.insertBefore(this.activeWidget, target); // Insert before target
			}
		}

		this.activeNode = null;

		const obj = {};
		obj.id = this.domFunctions.widgetGetId(evnt.target);
		obj.action = "drop";
		this.regression.log(JSON.stringify(obj));
		this.regression.record(obj);
	}
}


////////////////////// get,getLast,replace where all id functions
test() {  // used for testing, UI can be hard coded here to reduce amount of clicking to test code
}


/////// code to deprecate
////////////////////// get,getLast,replace where all id functions
idGet(increment) {  // was  get
	// called once for each id created for widget
	return (this.idCounter+increment).toString();
}

}  ///////////////////////////////////////////////////////////////// end class
