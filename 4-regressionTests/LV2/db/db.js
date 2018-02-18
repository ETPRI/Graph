/*

var x = new db();
x.setQuery('match (n) return n');
x.runQuery('method',this);

*/

//////////////////////////////////////////////
class db  {

constructor () {
	this.query        = ""; // complete Cypher query string

	// init in Query
	this.object       = {};  // call back object
	this.objectMethod = "";  // call back method

	this.session      = {};
	this.data         = [];
	this.args = [];
}


setQuery(query) {
	this.query = query;
}


////////////////////////////////////////////////////////////////////
runQuery (object, objectMethod, ...args) { // call widget, with widgetMethod when query is done
	// bring data from db into memory structure
	if (object) {
		this.object       = object;
	}
	else {
		this.object				=	null;
	}

	if (objectMethod) {
		this.objectMethod = objectMethod;
	}
	else {
		this.objectMethod = null;
	}
	this.session      = app.driver.session();
	this.data = [];
	this.args = args;

	// build data structure
	document.getElementById('debug').value = this.query;

	this.session.run(this.query, {}).subscribe(this);
	// added onNext,onCompleted, onError - methods for neo4j to call
}


////////////////////////////////////////////////////////////////////
// called by neo4j for each record returned by query
onNext(record) {
	let obj={};
	for (let i=0; i< record.length; i++) {
		obj[record.keys[i]]=record._fields[i];
		}
	this.data.push(obj);
}


////////////////////////////////////////////////////////////////////
// called by neo4j after the query has run
onCompleted(metadata){
  // could get some interesting info on query running
//  debugger;
	this.session.close();
	// let widget have the data
	if (this.object) { // Should just be ignored if no object and method are passed in
		this.object[this.objectMethod](this.data, ...this.args);
	}
}


// need to find all call back methods of session run and do stuff
////////////////////////////////////////////////////////////////////
// called by neo4j after the query has run
onError(err) {
alert("error db.js-"+err+". Original query: "+this.query)
}



} ///////////////////////////// end of class db
