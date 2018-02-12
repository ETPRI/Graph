/*
widgetTableQuery

display a cypher query in a table, used mainly for meta data reporting

*/


////////////////////////////////////////////////////////////////////  class start
class widgetTableQuery {
constructor (nameQueryObject, id) {
  // init instance variables
  this.html            = ""; // will contain html that makes up widget
  this.queryObjectName = nameQueryObject;  // key to select queryObj
  this.queryObjects    = {};  this.queryObjectsInit();            // currently 4 querys
  this.queryObj        = this.queryObjects[nameQueryObject];  // select one query
  this.fields          = this.queryObj.fields;
  this.tableName = nameQueryObject;
  this.dropdownId = id;

  this.db        = new db();   // create object to make query
  this.db.setQuery(this.queryObj.query);
  this.queryData = {};                       // where returned data will be stored

  // runQuery is asynchronous - it will read data in the background and call the method "queryComplete" when done
  this.db.runQuery(this,"queryComplete");         // make query, when done run method queryComplete
}


// this.db has finished building data
queryComplete(data) {
  this.queryData = data ;
  this.buildHeader();  // add to this.html
  this.buildData();    // add to this.html

  // add
  let parent = document.getElementById('widgets');
  let child = parent.firstElementChild;
  let newWidget = document.createElement('div'); // create placeholder div
  parent.insertBefore(newWidget, child); // Insert the new div before the first existing one
  newWidget.outerHTML = this.html; // replace placeholder with the div that was just written

  // log
  let obj = {};
  obj.id = this.dropdownId;
  obj.value = this.queryObjectName;
  obj.action = "click";
  obj.data = data;
  app.regression.log(JSON.stringify(obj));
  app.regression.record(obj);
}


////////////////////////////////////////////////////////////////////
buildHeader() {
  // build header

  const html =app.widgetHeader() +'<b> '+ this.tableName +` </b>

  <table>
    <thead>#header#</thead>
    <tbody>#data#</tbody>
  </table>
  </div>
  `

//  const html2 = app.idReplace(html,1);  // replace relative ids with absolute ides
  const html3 = html.replace("#header#",
  // create html for header
  (function(fields) {
  	// build search part of buildHeader
    let r="<tr>#fields#</tr>"

    // append label part of the header
    let f="";
    for (var propt in fields){
        f += "<th onClick='app.widgetSort(this)'>"+ fields[propt].label + "</th>" ;
  	}
    return r.replace('#fields#',f);
  }) (this.fields)
  )

 this.html = html3;
}


////////////////////////////////////////////////////////////////////
buildData() {
  let html = "";
  const r = this.queryData;  // from the db
  for (let i=0; i<r.length; i++) {
    html += '<tr>'
    for (let fieldName in this.fields) {
      // html += '<td ' + this.getatt(fieldName) +'>'+ r[i][fieldName] +"</td>" ;
      html += `<td ${this.getatt(fieldName)}idr="${fieldName}${i}">${r[i][fieldName]}</td>`;
    }
    html += "</tr>"
  }
  this.html = this.html.replace('#data#',html);
}


/* */
getatt(fieldName){
  let ret = this.fields[fieldName].att
  if (!ret) {
    ret="";
  }

  return (ret);
}


// init date from metadata db query
queryObjectsInit() {

this.queryObjects.nodes = {
  nameTable: "nodes"
  ,query: "MATCH (n) unwind labels(n) as L RETURN  distinct L, count(L) as count"
  ,fields: {
  	"L":       {label: "Labels", att: 'onclick="app.widgetNewClick(this)"' }
   ,"count":  {label: "Count"  }
  }}

this.queryObjects.keysNode = {
   nameQuery: ""
  ,query: "MATCH (p) unwind keys(p) as key RETURN  distinct key, labels(p) as label,  count(key) as count  order by key"
  ,fields: {
  		"key":     {label: "Key"   , comment: "like fields"}
  	 ,"label":   {label: "Node"  , comment: "Like a table in RDBS"}
  	 ,"count":   {label: "Count" , comment: ""}
   }}

this.queryObjects.relations = {
	nameTable: "relations"
	,query: "MATCH (a)-[r]->(b)  return distinct labels(a), type(r), labels(b), count(r)  order by type(r)"
	,fields: {
		"labels(a)":  {label: "Node"        , comment: "Like a table in RDBS"}
	 ,"type(r)":    {label: "-Relation->" , comment: "like fields"}
	 ,"labels(b)":  {label: "Node"        , comment: ""}
	 ,"count(r)":   {label: "Count"       , comment: ""}
	}}

this.queryObjects.keysRelation = {
   nameTable: "keys"
  ,query: "match ()-[r]->() unwind keys(r) as key return distinct key, type(r), count(key) as count"
  ,fields: {
  		"key":     {label: "Key"          , comment: "like fields"}
  	 ,"type(r)": {label: "-Relation->"  , comment: "Like a table in RDBS"}
  	 ,"count":   {label: "Count"        , comment: ""}
   }}


this.queryObjects.trash = {
   nameTable: "trash"
   ,query: "match (n) where not n._trash = '' return id(n) as id, labels(n) as labels, n._trash as trash, n"
   ,fields: {
       "id":     {label: "ID",   att: `onclick="app.widget('edit',this)"`}
   	 ,"labels": {label: "Labels"}
   	 ,"trash":  {label: "Trash"   }
    }}

} /// end method

edit(element){
// this.queryData[0].id.toString() === id
  let id = element.innerHTML;
  let n = this.queryData.filter(o => o.id.toString() === id);

  app.widgetNodeNew(element.nextElementSibling.innerText, n[0].n);

  let obj={};
  obj.id=app.domFunctions.widgetGetId(element);
  obj.idr=element.getAttribute("idr");
  obj.action="click";
  app.regression.log(JSON.stringify(obj));
  app.regression.record(obj);
}
} ////////////////////////////////////////////////// end class
