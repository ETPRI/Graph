// import "module-name";
// import('./widgetList.js');
// import does not work yet, just include modules in index.js in "correct order"

// app.js holds the globle functions and data for the application


class app { ///////////////////////////////////////////////////////////////// start class

constructor() {
	// called once by app.js to create the one instance
	this.widgets   = {}; // store widgets as they are created, remove when closed
	this.idCounter = 0;  // init id counter - used get getElementById, is the id of the widget
	this.metaData  = new metaData();
	this.db        = new db();

	// used by classDB to access neo4j database,
	this.authToken = neo4j.v1.auth.basic("neo4j", "neo4j");
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


widget(method, widgetElement) {
	// app.widget("add",this) on widget to get back to method from html to class
	const id = this.widgetGetId(widgetElement);
	if (id) {
		this.widgets[id][method](widgetElement); //  Call the method, which belongs to the widget containing widgetElement, and pass in widgetElement?
	} else {
     // create instance of widget and remember it
		 alert("App.widget: Error, method= "+ method);
	}
}


menuNodesInit() { // build node dropdown menu from node meta data
	const menu = document.getElementById('menuNodes');
	let html = "";  // build dropdown menu selections
	for (var nodeName in this.metaData.node) { // nodeName is the name of the node, like "people" or "Movie"
		html += `<option value="${nodeName}">${nodeName}</option>`
	}
	menu.innerHTML += html;
}


menuNodes(control){  // displays widgetTableNodes based on menu selection - nodes, allow search, add/edit
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

/* for debugging / dev place to write messages */
log(message){
	if (!document.getElementById('log').hidden) {
		document.getElementById('log').innerHTML += "<br>" + message;
	}
}


logText(textBox) {  // Logs when any text field is changed in a widgetTableNodes object.
	let obj = {};
	obj.id = this.widgetGetId(textBox);
	obj.idr = textBox.getAttribute("idr");
	obj.value = textBox.value;
	this.log(JSON.stringify(obj));
}

// Logs when the search criterion for an input field changes
logSearchChange(selector) { // selector is the dropdown which chooses among "S", "M" or "E" for strings, and "<", ">", "<=", ">=" or "=" for numbers.
  let obj = {};
	obj.id = this.widgetGetId(selector);
	obj.idr = selector.getAttribute("idr");
	obj.value = selector.options[selector.selectedIndex].value;
	this.log(JSON.stringify(obj));
}


logToggle(button) { // toggle log on off
	log = document.getElementById('log');
	log.hidden = !log.hidden;
	if (!log.hidden) {
		// clear Log
		log.innerHTML = "";
		this.log("logging started");
		button.value = "log stop";
	} else {
		button.value = "log start";
	}
}

// brings up add/edit widget form table for one node
// keys in first column, values in second column
widgetNodeNew(nodeName, data) {
		this.widgets[this.idCounter] = new widgetNode(nodeName, data);
}

widgetNode(nodeName, data) {
		this.widgets[this.idCounter] = new widgetNode(nodeName, data);
}


// /* refresh widget with new database call */
widgetSearch(domElement) {
	// called from widgetList
	const id = this.widgetGetId(domElement);
	this.widgets[id].searchTrigger = id;  
	this.widgets[id].search();
}

widgetHeader(tag){
	if (!tag) {
		var tag = "div";
	}
	return(`
<${tag} id="${this.idCounter++}" class="widget"><hr>
<input type="button" value="X" idr="closeButton" onclick="app.widgetClose(this)">
<input type="button" value="__" idr="expandCollapseButton" onclick="app.widgetCollapse(this)">
		`)
}

/* toggle expand collapse */
widgetCollapse(domElement) {
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
	obj.id = this.widgetGetId(domElement);
	obj.idr = domElement.getAttribute('idr');
	this.log(JSON.stringify(obj));
}


widgetClose(widgetElement) {
	/* app.widgetClose(this)
	input - widgetElement
	action - removes widget from screen
	*/
	const id = this.widgetGetId(widgetElement);

	// delete javascript instance of widgetTable
	delete this.widgets[id];

	// delete  html2 from page
	const widget = document.getElementById(id);
	widget.parentElement.removeChild(widget);

	// log
	let obj = {};
	obj.id = id;
	obj.idr = widgetElement.getAttribute("idr");
	this.log(JSON.stringify(obj));
}


widgetGetId(domElememt) {
	/* input - domElememt inside a widget
	   return - string id associated with widget
	*/
	// go up the dom until class="widget" is found,
	// grap the id and
	if (domElememt.getAttribute("class") == "widget") {
		// found start of widget
		return(domElememt.getAttribute("id"));
	} else {
		return(this.widgetGetId(domElememt.parentElement));
	}

	/* need some error processing if the original domElememt passed is not inside a widget,
	or if there is a widget construction error and the class was not placed there */
}


getChildByIdr(element, idr) {
	// returns the first child of the given element that has the given idr. If no child has that idr, returns null.
	let children = element.querySelectorAll("*"); // get all the element's children...
	for (let i = 0; i < children.length; i++) { // loop through them...
		if (children[i].getAttribute("idr") == idr) {
			return children[i]; // and return the first one whose idr matches...
		}
	}
	return null; // or null if no idr matches
}

test() {  // used for testing, UI can be hard coded here to reduce amount of clicking to test code
}


/////// code to deprecate
////////////////////// get,getLast,replace where all id functions
idGet(increment) {  // was  get
	// called once for each id created for widget
	return (this.idCounter+increment).toString();
}

}  ///////////////////////////////////////////////////////////////// end class
