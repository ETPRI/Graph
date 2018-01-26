/*
widgetTableNodes

display, search, add/edit on nodes ******************

*/

class widgetTableNodes {
////////////////////////////////////////////////////////////////////
// tableName
// id - for document.getElementById(id)
constructor (queryObjectName) { // name of a query Object
  this.queryObjectName = queryObjectName;
  this.queryObject     = app.metaData.getNode(queryObjectName);
  this.fields          = this.queryObject.fields;
  this.fieldsDisplayed = this.queryObject.fieldsDisplayed;
  this.db              = new db();  // where db object will be new db(this.queryObj)
  this.queryData       = {}; // where returned data will be stored

  this.idWidget = app.idGet(0);   // strings
  this.idLimit  = app.idGet(1);
  this.idHeader = app.idGet(2);
  this.idData   = app.idGet(3);

  this.buildHeader();  //  show table header on screen
  this.search();       // do search with no criteria
}


////////////////////////////////////////////////////////////////////
search() { // public - call when data changes
  this.db.setQuery(this.buildQuery());
  this.db.runQuery(this,"buildData");
}


buildQuery() { // public - called when search criteria change
  // init cypherQuery data
  let match    = "(n:" +this.queryObject.nodeLabel+ ")";
  let where    = this.buildWhere();
  let orderBy  = "n." + this.queryObject.orderBy;
  let limit    = document.getElementById(this.idLimit).value;

  let query =
	    "match " + match
		+ (function(w){if(0<w.length) return " where "  + w + " "; else return " ";})(where)
		+ "return n "
		+ (function(o){if(0<o.length) return " order by "+ o + " "; else return " ";}) (orderBy)
		+ (function(l){if (l.trim === "") return ""; else return " limit " + l}) (limit)
		;

  return(query);
}


buildWhere() {
  /*   output - nameLast =~"(?i)Bol.*"
  */  // <tr><th><input>  must go up 2 levels to get to tr
  const th  = document.getElementById(this.idHeader).firstElementChild.children; // get collection of th

  let where = "n._trash = '' and ";
  // iterate siblings of input

  for(let i=2; i<th.length; i++) {
    let inputDOM = th[i].firstElementChild;  // <input>  tag
    let dropDown = inputDOM.nextElementSibling;
    if (0 < inputDOM.value.length) {
      // get value of search type
      let searchType = dropDown.options[dropDown.selectedIndex].value;
      let w1 = "";
      if (dropDown.options[0].value === "S") {
        w1 = this.getSearchString(inputDOM, searchType);  // assume a string search
      } else {
        w1 = this.getSearchNumber(inputDOM, searchType);  // assume a number search
      }
      where += w1;
      }
    }
    return (where.substr(0, where.length-5)) ;
}


getSearchNumber(inputDOM, searchType) {
  // n.born <= 1958   match (n:Person) where n.name=~"(?i)ton.*" return n order by n.nameLast  limit 9
  const w = "n."+ this.getAtt(inputDOM,"fieldName") +searchType + inputDOM.value +' and ';
  return(w);
}


getSearchString(inputDOM, searchType) {
  const w = "n."+ this.getAtt(inputDOM,"fieldName") +'=~"(?i)#s#' + inputDOM.value +'#E#" and ';

  let w1="";
  switch(searchType) {
  case "S":    // start
      w1 = w.replace('#s#',"").replace('#E#','.*');    break;
  case "M":    // middle
      w1 = w.replace('#s#',".*").replace('#E#','.*');  break;
  case "E":    // end
      w1 = w.replace('#s#',".*").replace('#E#','');    break;
  case "=":    // equal to
      w1 = w.replace('#s#',"").replace('#E#','');      break;
  default:
      alert("app.js:buildWhere - error")
  }
  return(w1);
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
  const html = app.widgetHeader()
  +'<b> '+this.queryObject.nodeLabel +":"+ this.queryObjectName +` </b>
  <input type="button" value="Add"     onclick="app.widget('addNode',this); app.logButton(this)">
  <input type="button" value="Search"  onclick="app.widgetSearch(this); app.logButton(this)">
  limit <input id="#1#" value ="9" style="width: 20px;" onblur = "app.logLimit(this)">

  <table>
    <thead id="#2#">
    <tr><th></th><th></th>#headerSearh#</tr>
    <tr><th>#</th><th>ID</th>#header#</tr>
    </thead>
    <tbody id="#3#"> </tbody>
  </table>
  <!-- popup goes here -->
  </div>
  `

  const strSearch = `
  <select onclick = "app.logSearchChange(this)">
  <option value="S">S</option>
  <option value="M">M</option>
  <option value="E">E</option>
  <option value="=">=</option>
  </select></th>`

  const numSearch = `
  <select onclick = "app.logSearchChange(this)">
  <option value=">">&gt;</option>
  <option value=">=">&gt;=</option>
  <option value="=">=</option>
  <option value="<=">&lt;=</option>
  <option value="<">&lt;</option>
  </select></th>`

  const html2 = app.idReplace(html,0);  // replace relative ids with absolute ids
  const html3 = html2.replace('#tableName#',this.tableName);

  // build search part of buildHeader
  let s="";
  for (let i=0; i<this.fieldsDisplayed.length; i++ ) {
      let fieldName =this.fieldsDisplayed[i];
      let s1 = `<th><input db="fieldName: #1" size="7" onblur="app.logText(this)">`
      if (this.fields[fieldName].type === "number") {
        // number search
        s1 += numSearch;
      } else {
        // assume string search
        s1 += strSearch;
      }
      s += s1.replace('#1',fieldName)
  }
  const html4 = html3.replace('#headerSearh#',s)

  // build field name part of header
  let f="";
  for (let i=0; i<this.fieldsDisplayed.length; i++ ) {
      let fieldName =this.fieldsDisplayed[i];
      f += "<th onClick='app.widgetSort(this)'>"+ this.fields[fieldName].label + "</th>" ;
  }
  const html5 = html4.replace('#header#',f);

  document.getElementById('widgets').innerHTML =
    html5 + document.getElementById('widgets').innerHTML;
}


buildData(data) {  // build dynamic part of table
  this.queryData = data; // only one row should have been returned

  let html = "";
  const r = data;
  let rowCount = 1;
  for (let i=0; i<r.length; i++) {
    html += '<tr><td>' +rowCount++ + `</td><td onClick="app.widget('edit',this); app.logEdit(this)">` +r[i]["n"].identity+ '</td>'
    for (let j=0; j<this.fieldsDisplayed.length; j++) {
      let fieldName =this.fieldsDisplayed[j];
      html += '<td '+ this.getatt(fieldName) +'>'+ r[i]["n"].properties[fieldName]  +"</td>" ;
    }
    html += "</tr>"
  }

  document.getElementById(this.idData).innerHTML = html;
}


getatt(fieldName){  /* */
  let ret = this.fields[fieldName].att
  if (!ret) {
    ret="";
  }

  return (ret);
}


edit(element){
//  this.data.filter(o => o.n.identity===23)
  let id = element.innerHTML;
  let n = this.queryData.filter(o => o.n.identity.toString() === id);

  app.widgetNodeNew(this.queryObject.nodeLabel,n[0].n);
}


// open add widget
addNode(){
  app.widgetNodeNew(this.queryObject.nodeLabel);
}


} ////////////////////////////////////////////////////// end class widgetTableNodes
