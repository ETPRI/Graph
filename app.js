// import "module-name";
// import('./widgetList.js');
// import does not work yet, just include modules in index.js in "correct order"

/**
 *

 app.js holds the globle functions and data for the application

 */

class app { ///////////////////////////////////////////////////////////////// start class
/* class keeps track of widget id -> needed to support document.getElementById.
could be deprecated if we only guaranteed unique id for a widget, and then search
from the head of the widget down for the id */

// create incrementing unique IDs for widget components so that document.getElementById("") works
constructor() {
	// called once by app.js to create the one instance
	this.widgets   = {}; // store widgets as they are created, remove when closed
	this.idCounter = 0;  // init id counter
	// this.recording = false;
	// this.recordText = {};
	// this.recordedStep = 1;
	// this.playing = false;
	// this.playbackObj = {};
	// this.instruction = 2;
	this.metaData  = new metaData();

	// used by classDB to access neo4j database,
	this.authToken = neo4j.v1.auth.basic("neo4j", "neo4j");
	this.driver    = neo4j.v1.driver("bolt://localhost", this.authToken, {encrypted:false});
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
getChildByIdr(element, idr) {
	let children = element.querySelectorAll("*"); // get all the element's children...
	for (let i = 0; i < children.length; i++) { // loop through them...
		//alert("Checking child " + i + " of widget ID " + element.id + "; idr = " + children[i].getAttribute("idr") + "; target: " + idr);
		if (children[i].getAttribute("idr") == idr) {
			return children[i]; // and return the first one whose idr matches...
		}
	}
	return null; // or null if no idr matches
}

menuNodesInit(){
	let menu = document.getElementById('menuNodes');
	const selectionTemplate = '<option value="#db#">#db#</option>'
	let html = "";  // build dropdown menu selections
	for (var nodeName in this.metaData.node) { // nodeName is the name of the node, like "people" or "Movie"
		html += selectionTemplate.replace(/#db#/g, nodeName);
	}
	menu.innerHTML += html;
}


// <option value="">-- my db ---</option>
//
// <option value="">-- Movie DB ---</option>
// <option value="Person">Person</option>
// <option value="Movie">Movie</option>

/* displays nodes, allow search, add/edit */
menuNodes(control){
	let dropDown = document.getElementById('menuNodes');
	let value = dropDown.options[dropDown.selectedIndex].value;
	if (value==="") return;  // menu comment
	this.widgets[this.idCounter] = new widgetTableNodes(value, control.id);
}

/* displays meta-data on nodes, keysNodes, relations, keysRelations */
menuDBstats(dropDown){
	let value = dropDown.options[dropDown.selectedIndex].value;
	if (value==="") return; // menu comment
	this.widgets[this.idCounter] = new widgetTableQuery(value, dropDown.id);
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

widgetHeader(){
	return(`
<div id="` + this.idCounter++ + `" class="widget"><hr>
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
	obj.action = "click";
	this.regression.log(JSON.stringify(obj));
	this.regression.record(obj);
}


/* app.widgetClose(this)
input - widgetElement
action - removes widget from screen
*/
widgetClose(widgetElement) {
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
	obj.action = "click";
	this.regression.log(JSON.stringify(obj));
	this.regression.record(obj);
}


/* input - domElememt inside a widget
   return - string id associated with widget
*/
widgetGetId(domElememt) {  // was getWidgetId
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


test() {
	// test

/*

	this.widgets[this.idGet(0)] = new widgetTableQuery('trash');   // problem with edit
	this.widgets[this.idGet(0)] = new widgetTableQuery('nodes');  // search brokent
	this.widgets[this.idGet(0)] = new widgetTableQuery('keysNode');  // seems to work
	this.widgets[this.idGet(0)] = new widgetTableQuery('relations');  // seems to work
	this.widgets[this.idGet(0)] = new widgetTableQuery('keysRelation');  // seems to work
*/

	this.widgets[this.idCounter] = new widgetTableNodes('people');
/*





*/
}


}  ///////////////////////////////////////////////////////////////// end class




////////////////////////////////////////
/*

Global functions called from widgets events.  Generally the widgets call with the parameter "this":

app.widget.close(this);

the global functions can use the "this" passed in. to get other widget info.

Usually button functions, onclick events

*/


///////////////////////  widget menu functions  ////////////////////////////


//
// /* not sure this is helpful  */
// app.widget.t = function (fun,domElement) {
// 	// called from widgetList
// 	let widget = app.widget.getWidgetId(domElement);
// 	widget[fun](domElement);
// }
//
//
// app.widget.edit = function (domElement) {
// 	// called from widgetList
// 	let widget = app.widget.getWidgetId(domElement);
// 	widget.edit(domElement);
// }
//
//
// app.widget.add = function (domElement) {
// 	// called from widgetList
// 	let widget = app.widget.getWidgetId(domElement);
// 	widget.add(domElement);
// }


//////////// specialized functions



// app.widget.sort = function (domElement) {
// 	// called from widgetList
// 	app.db[ this.tableName ].cypher.orderBy
// 	app.widgets[domElement.parentElement.id].search();
// }

// app.widget.editForm = function (domElement) {
// 	// popup edit form - needs work, must load data from one clicked
// 	app.widget.getWidgetId(domElement).addEditForm();
// }

/* not using popup right now */
// app.widget.addForm = function (domElement) {
// 	// called from widgetList
// 	let widget = app.widgets[domElement.parentElement.id]
// 	widget.addFrom(domElement);
// }

// app.widget.popUpClose = function (domElement) {
// 	// called from popUp
// 	let popUp = domElement.parentElement;
// 	popUp.parentElement.removeChild(popUp);
// }
