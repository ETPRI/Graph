
//////////////////////////////////////////////
class db  {

constructor (query) {
	this.query        = query; // complete Cypher query string
	this.data         = {};

	// init in Query
	this.object       = {};
	this.objectMethod = "";
	this.session      = {};
	this.data         = [];
}


////////////////////////////////////////////////////////////////////
runQuery (object, objectMethod) { // call widget, with widgetMethod when query is done
	// bring data from db into memory structur
	this.object       = object;
	this.objectMethod = objectMethod;
	this.session  = app.driver.session();
	this.data = [];

	// build data structure
	document.getElementById('debug').value = this.query;

	this.session.run(this.query, {}).subscribe(this);
	// added onNext and onCompleted methods for neo4j to call
	//  app.neo4j.session.run(query, {}).subscribe(this);
}


////////////////////////////////////////////////////////////////////
// called by neo4j for each record returned by query
onNext(record) {
  // On receipt of RECORD
  //	app.widgetTable.add(tr,"td",document.createTextNode(++recordCount)); // add record count to first colum of table
	if (record["_fields"][0].properties) {
		// assume a single node object returned
		this.data.push(record["_fields"][0].properties);
	} else {
		// assume a list of things was returned, so put it in an object to push
		let obj={};
		for (let i=0; i< record.length; i++) {
			obj[record.keys[i]]=record._fields[i];
		}
		this.data.push(obj);
	}
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
onError() {

}



} ///////////////////////////// end of class db
