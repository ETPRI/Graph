/*
widgetTableNosw

display, search, add/edit on nodes ******************

*/

class widgetTableNodes {
////////////////////////////////////////////////////////////////////
// tableName
// id - for document.getElementById(id)
constructor (queryObjectName) { // name of a query Object
  this.queryObjectName = queryObjectName;
  this.queryObjects    = {};  this.queryObjectsInit();
  this.queryObject     = this.queryObjects[queryObjectName];
  this.fields          = this.queryObject.fields;
  this.db              = {};  // where db object will be new db(this.queryObj)
  this.queryData       = {}; // where returned data will be stored

  this.idWidget = app.idGet(0);   // strings
  this.idLimit  = app.idGet(1); // does not seemed to be used
  this.idHeader = app.idGet(2);
  this.idData   = app.idGet(3);

  this.tbody           = {}; // init after header is rendered

  this.buildHeader();  //  show table header on screen
  this.search();       // do search with no criteria
}


////////////////////////////////////////////////////////////////////
search() { // public - call when data changes
  this.db = new db(this.buildQuery());
  this.db.runQuery(this,"buildData");
}


buildQuery() { // public - called when seach criteria changes
  // init cypherQuery data
  let match    = "(n:" +this.queryObject.nodeLabel+ ")";
  let where    = this.buildWhere();
  let orderBy  = "n." + this.queryObject.orderBy;
  let limit    = document.getElementById(this.idLimit).value;

  let query =
	    "match " + match
		+ (function(w){if(0<w.length) return " where "  + w + " "; else return " ";})(where)
		+ "return n" //+ this.buildReturn() + " "
		+ (function(o){if(0<o.length) return " order by "+ o + " "; else return " ";}) (orderBy)
		+ (function(l){if (l.trim === "") return ""; else return " limit " + l}) (limit)
		;

  return(query);
}


buildWhere() {
  /*   output - nameLast =~"(?i)Bol.*"
  */  // <tr><th><input>  must go up 2 levels to get to tr
  const th  = document.getElementById(this.idHeader).firstElementChild.children; // get collection of th
  let where = "";
  // iterrate siblings of input
  for(let i=0; i<th.length; i++) {
    let input = th[i].firstElementChild;
    if (0<input.value.length) {
      where += "n."+ this.getAtt(input,"fieldName") +'=~"(?i)' + input.value +'.*" and ';
    }
  }
  return (where.substr(0, where.length-5)) ;
}


getAtt(element,attName) { // private -----------
	/*
  input - element - is DOM input Object
          attName - name of attribute in db
  return - attribute value from db
	*/
  const ret = element.getAttribute("db").split(attName+":")[1].split(";")[0].trim();
	return(ret);
}


////////////////////////////////////////////////////////////////////
buildHeader() {
  // build header
  const html =`
  <div id="#0#" class="widget" db="nameTable: #tableName#"><hr><b>
  <input type="button" value="Close"   onclick="app.widgetClose(this)"> ` +this.queryObject.nodeLabel +":"+ this.queryObjectName +` </b>
  <input type="button" value="Add"     onclick="app.widgetAdd(this)">
  <input type="button" value="Save"    onclick="app.widgetSave(this)">
  <input type="button" value="Search"  onclick="app.widgetSearch(this)">
  <input type="button" value="Colapse" onclick="app.widgetCollapse(this)"> limit
  <input id="#1#" value ="9" style="width: 20px;">
  <table>
    <thead id="#2#"> #header# </thead>
    <tbody id="#3#"> </tbody>
  </table>
  <!-- popup goes here -->
  </div>
  `

  const html2 = app.idReplace(html,0);  // replace relative ids with apsolute ides
  const html3 = html2.replace('#tableName#',this.tableName).replace("#header#",
  // create html for header
  (function(fields, idWidget) {
  	// build search part of buildHeader
    let r="<tr>#search#</tr><tr>#fields#</tr>";
      // put in search row
    let s="";
    for (var fieldName in fields) {
        let s1 = '<th><input " db="fieldName: #1"></th>'
        s += s1.replace('#1',fieldName)
  	}

    // append lable part of the header
    let f="";
    for (var propt in fields){
        f += "<th onClick='app.widgetSort(this)'>"+ fields[propt].label + "</th>" ;
  	}
    return r.replace('#search#',s).replace('#fields#',f);
  }) (this.fields, this.idWidget)
  )

  document.getElementById('widgets').innerHTML =
    html3 + document.getElementById('widgets').innerHTML;

  this.tbody = document.getElementById(this.idData);

}


buildData() {  // build dynamic part of table
  let html = "";
  const r = this.db.data;
  for (let i=0; i<r.length; i++) {
    html += '<tr>'
    for (let fieldName in this.fields) {
      html += '<td ' + this.getatt(fieldName) +'>'+ r[i][fieldName] +"</td>" ;
    }
    html += "</tr>"
  }
  this.tbody.innerHTML = html ;
}


getatt(fieldName){  /* */
  let ret = this.fields[fieldName].att
  if (!ret) {
    ret="";
  }

  return (ret);
}


queryObjectsInit() { // move to DB in the future
this.queryObjects.people = {
   nodeLabel: "people"
  ,orderBy: "nameLast"
  ,fields: {
  	"nameLast":   {label: "Last Name"}
   ,"nameFirst":  {label: "First Name"  }
   ,"email":      {label: "Email"  }
   ,"state":      {label: "State"  }
   ,"country":    {label: "Country"  }
  }}

this.queryObjects.Person = {
   nodeLabel: "Person"
  ,orderBy: "nameLast"
  ,fields: {
  	"name":  {label: "Name"}
   ,"born":  {label: "Born"  }
  }}

this.queryObjects.Movie = {
   nodeLabel: "Movie"
  ,orderBy: "nameLast"
  ,fields: {
  	"title":     {label: "Title"}
    ,"released":  {label: "Released"  }
    ,"tagline":  {label: "Tagline"  }
  }}

}


} ////////////////////////////////////////////////////// end class widgetTableNodes


// /* */
// edit(domElement) {
//   // edit row - move values from click to input nextElementSibling
//   let th = document.getElementById(this.idHeader).firstElementChild.firstElementChild;
//   while(domElement){
//     th.firstElementChild.value = domElement.textContent;
//     domElement=domElement.nextElementSibling;
//     th = th.nextElementSibling;
//   }
//
// }


// add() {
//   // CREATE (:person {name:'David Bolt', lives:'Knoxville'})
//   let th  = document.getElementById(this.idHeader).firstElementChild.firstElementChild;
//
//   const create = "create (:"+ this.tableName +" {#data#})";
//   let data="";
//   while (th) {
//     let inp = th.lastElementChild;
//
//
//
//     data += this.getAtt(inp,"fieldName") +":'" + inp.value +"', ";
//     th=th.nextElementSibling;
//   }
//
//   let query = create.replace("#data#", data.substr(0,data.length-2) );
//   document.getElementById('debug').value = query;
//
//   this.session.run(query, {}).subscribe(this);
// }
