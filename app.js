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
	const id = this.domFunctions.widgetGetId(widgetElement);
	if (id) {
		this.widgets[id][method](widgetElement); //  Call the method, which belongs to the widget containing widgetElement, and pass in widgetElement?
	} else {
     // create instance of widget and remember it
		 alert("App.widget: Error, method= "+ method);
	}
}


// menuNodesInit(data){
// 	let menu = document.getElementById('menuNodes');
// 	const selectionTemplate = '<option value="#db#">#db#</option>'
// 	let html = "";  // build dropdown menu selections
// 	const r = data;  // from the db
//   for (let i=0; i<r.length; i++) {
//     html += selectionTemplate.replace(/#db#/g, r[i]["nodeName"]);
//   }
// 	menu.innerHTML += html;
// }
// returns the first child of the given element that has the given idr. If no child has that idr, returns null.
// getChildByIdr(element, idr) {
// 	let children = element.querySelectorAll("*"); // get all the element's children...
// 	for (let i = 0; i < children.length; i++) { // loop through them...
// 		//alert("Checking child " + i + " of widget ID " + element.id + "; idr = " + children[i].getAttribute("idr") + "; target: " + idr);
// 		if (children[i].getAttribute("idr") == idr) {
// 			return children[i]; // and return the first one whose idr matches...
// 		}
// 	}
// 	return null; // or null if no idr matches
// }

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

// brings up add/edit widget form table for one node
// keys in first column, values in second column
widgetNodeNew(nodeName, data) {
		this.widgets[this.idCounter] = new widgetNode(nodeName, data);
}

// This does the same thing as the above method - why have both?
widgetNode(nodeName, data) {
		this.widgets[this.idCounter] = new widgetNode(nodeName, data);
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
	delete this.widgets[id];

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


// widgetGetId(domElement) {
// 	/* input - domElememt inside a widget
// 	   return - string id associated with widget
// 	*/
// 	// go up the dom until class="widget" is found,
// 	// grap the id and
// 	if (domElement.getAttribute("class") == "widget") {
// 		// found start of widget
// 		return(domElement.getAttribute("id"));
// 	} else {
// 		return(this.widgetGetId(domElement.parentElement));
// 	}

	/* need some error processing if the original domElememt passed is not inside a widget,
	or if there is a widget construction error and the class was not placed there */
//

// AMF: Yes, this is still used, but I moved it while trying to debug part of the code.
// I should have put it back when I realized its location didn't actually matter. Sorry.
// The new version is at the top of the class, so it's fine to comment out this duplicate.

/* dwb, I assume this is still used, the merged flagged it, so I'm commenting it out
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
*/

////////////////////// get,getLast,replace where all id functions
idGet(increment) {  // was  get
	// called once for each id created for widget
	return (this.idCounter+increment).toString();
}

// // when is this used?
// idGetLast() { // was getLast
// 	return app.widgets[this.idCounter];
// }

// replace id holder in widget header with unique ids
// idReplace(html, counter) { // public - was replace
// 	// called once for each widget created
// 	//replace #id0# with idCounter, #id1# with idCounter+1 etc, then increment idCounter to next unused id
// 	let ret = html.replace("#"+counter++ +"#", "" + this.idCounter++);
//   if (html === ret) {
// 		// all the replacements have been done - assume no ids are skipped, will break code
// 		// save widget
// 		return (ret);
// 	} else {
// 		// recursively call until there are no more changes to make
// 		return( this.idReplace(ret, counter));
// }}


test() {  // used for testing, UI can be hard coded here to reduce amount of clicking to test code
}


/////// code to deprecate
////////////////////// get,getLast,replace where all id functions
idGet(increment) {  // was  get
	// called once for each id created for widget
	return (this.idCounter+increment).toString();
}

}  ///////////////////////////////////////////////////////////////// end class
