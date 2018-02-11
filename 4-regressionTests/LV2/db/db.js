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
}


setQuery(query) {
	this.query = query;
}


////////////////////////////////////////////////////////////////////
runQuery (object, objectMethod) { // call widget, with widgetMethod when query is done
	// bring data from db into memory structure
	this.object       = object;
	this.objectMethod = objectMethod;
	this.session      = app.driver.session();
	this.data = [];

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
	this.object[this.objectMethod](this.data);
}


// need to find all call back methods of session run and do stuff
////////////////////////////////////////////////////////////////////
// called by neo4j after the query has run
onError(err) {
alert("error db.js-"+err+". Original query: "+this.query)
}



} ///////////////////////////// end of class db
