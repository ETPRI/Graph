// import "module-name";
// import('./widgetList.js');
// import does not work yet, just include modules in index.js in "correct order"

// app.js holds the globle functions and data for the application

class app { ///////////////////////////////////////////////////////////////// start class

constructor() {
	// called once by app.js to create the one instance
	this.widgets   = {}; // store widgets as they are created, remove when closed
	this.idCounter = 0;  // init id counter - used get getElementById, is the id of the widget

	this.metaData  			= new metaData();
	this.db        			= new db();
	this.domFunctions 	= new domFunctions();
	this.regression 		= new regressionTesting();
	this.login 					= new widgetLogin();
	this.widgets.regressionHeader = this.regression;
	this.widgets.loginDiv = this.login;
	// used by classDB to access neo4j database,
	this.authToken = neo4j.v1.auth.basic("neo4j", "paleo3i");
	this.driver    = neo4j.v1.driver("bolt://localhost", this.authToken, {encrypted:false});
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
	if (id) {
		this.widgets[id][method](widgetElement, ...args); //  Call the method, which belongs to the widget containing widgetElement, and pass in widgetElement. SHOULD also pass in extra args
	} else {
     // create instance of widget and remember it
		 alert("App.widget: Error, method= "+ method);
	}
}


menuNodesInit(){
	let menu = document.getElementById('menuNodes');
	const selectionTemplate = '<option value="#db#">#db#</option>'
	let html = "";  // build dropdown menu selections
	for (var nodeName in this.metaData.node) { // nodeName is the name of the node, like "people" or "Movie"
		html = selectionTemplate.replace(/#db#/g, nodeName);
		let dropDown = document.createElement('option');
		menu.appendChild(dropDown);
		dropDown.outerHTML = html;
	}
}


menuNodes(control) {  // displays widgetTableNodes based on menu selection - nodes, allow search, add/edit
	const dropDown = document.getElementById('menuNodes');
	let value = dropDown.options[dropDown.selectedIndex].value;
	if (value==="") return;  // menu comment
	this.widgets[this.idCounter] = new widgetTableNodes(value, control.id);
}


/* displays meta-data on nodes, keysNodes, relations, keysRelations */
menuDBstats(dropDown){
	const value = dropDown.options[dropDown.selectedIndex].value;
	if (value==="") return; // menu comment
	this.widgets[this.idCounter] = new widgetTableQuery(value, dropDown.id);
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
<${tag} id="${this.idCounter++}" class="widget"><hr>
<input type="button" value="X" idr="closeButton" onclick="app.widgetClose(this)">
<input type="button" value="__" idr="expandCollapseButton" onclick="app.widgetCollapse(this)">
		`)
}


widgetCollapse(domElement) {  // toggle expand collapse
	// called from widgetList
	let table=domElement.parentElement.lastElementChild;
  // above code is brittle, it assumes position of table relative to button.

	table.hidden = !table.hidden  // toggle hidden
	if(table.hidden) {
		domElement.value = "+";
	} else {
		domElement.value = 	"__";
	}

	// log
	let obj = {};
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

	// delete  html2 from page
	const widget = document.getElementById(id);
	widget.parentElement.removeChild(widget);

	// log
	let obj = {};
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
