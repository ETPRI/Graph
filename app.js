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
	this.metaData  = new metaData();

	// used by classDB to access neo4j database,
	this.authToken = neo4j.v1.auth.basic("neo4j", "neo4j");
	this.driver    = neo4j.v1.driver("bolt://localhost", this.authToken, {encrypted:false});
}


widget(method, widgetElement) {
	// app.widget("add",this) on widget to get back to method from html to class
	const id = this.widgetGetId(widgetElement);
	if (id) {
		this.widgets[id][method](widgetElement);
	} else {
     // create instance of widget and remember it
		 alert("App.wdiget: Erorr, method= "+ method);
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
menuNodes(){
	let dropDown = document.getElementById('menuNodes');
	let value = dropDown.options[dropDown.selectedIndex].value;
	if (value==="") return;  // menu comment
	this.widgets[this.idGet(0)] = new widgetTableNodes(value);
}

/* displays meta-data on nodes, keysNodes, relations, keysRelations */
menuDBstats(dropDown){
	let value = dropDown.options[dropDown.selectedIndex].value;
	if (value==="") return; // menu comment
	this.widgets[this.idGet(0)] = new widgetTableQuery(value);
}

/* for debugging / dev place to write messages */
log(message){
	if (!document.getElementById('log').hidden) {
		document.getElementById('log').innerHTML += "<br>" + message;
	}
}


// toggle log on off
logToggle(button){
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
		this.widgets[this.idGet(0)] = new widgetNode(nodeName, data);
}

widgetNode(nodeName, data) {
		this.widgets[this.idGet(0)] = new widgetNode(nodeName, data);
}


// /* refresh widget with new database call */
widgetSearch(domElement) {
	// called from widgetList
	const id = this.widgetGetId(domElement);
	this.widgets[id].search();
}

widgetHeader(){
	return(`
<div id="#0#" class="widget" db="nameTable: #tableName#"><hr>
<input type="button" value="X"   onclick="app.widgetClose(this)">
<input type="button" value="__" onclick="app.widgetCollapse(this)">
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
	widget.parentElement.removeChild(widget)
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

// when is this used?
idGetLast() { // was getLast
	return app.widgets[this.idCounter];
}

// replace id holder in widget header with unique ids
idReplace(html, counter) { // public - was replace
	// called once for each widget created
	//replace #id0# with id.counter, #id1# with id.counter+1 etc, then increment counter to next unused id
	let ret = html.replace("#"+counter++ +"#", "" + this.idCounter++);
  if (html === ret) {
		// all the replacements have been done - assume no ids are skipped, will break code
		// save widget
		return (ret);
	} else {
		// recursively call until there are no more changes to make
		return( this.idReplace(ret, counter));
}}

test() {
	// test

/*

	this.widgets[this.idGet(0)] = new widgetTableQuery('trash');   // problem with edit
	this.widgets[this.idGet(0)] = new widgetTableQuery('nodes');  // search brokent
	this.widgets[this.idGet(0)] = new widgetTableQuery('keysNode');  // seems to work
	this.widgets[this.idGet(0)] = new widgetTableQuery('relations');  // seems to work
	this.widgets[this.idGet(0)] = new widgetTableQuery('keysRelation');  // seems to work
*/

	this.widgets[this.idGet(0)] = new widgetTableNodes('people');
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
