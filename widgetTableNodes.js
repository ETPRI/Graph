/*
widgetTableNodes

display, search, add/edit on nodes ******************

*/

class widgetTableNodes {
////////////////////////////////////////////////////////////////////
  // tableName
  // id - for document.getElementById(id)
  constructor (queryObjectName, controlId) { // name of a query Object, and ID of the control that requested it
    this.queryObjectName = queryObjectName;
    this.queryObject     = app.metaData.getNode(queryObjectName);
    this.fields          = this.queryObject.fields;
    this.fieldsDisplayed = this.queryObject.fieldsDisplayed;
    this.db              = new db();  // where db object will be new db(this.queryObj)
    this.queryData       = {}; // where returned data will be stored

    this.idWidget = app.idGet(0);   // strings
  //  this.idLimit  = app.idGet(1);
  //  this.idHeader = app.idGet(2);
  //  this.idData   = app.idGet(3);
    this.searchTrigger = controlId;

    this.buildHeader();  //  show table header on screen
    this.widget = document.getElementById(this.idWidget);

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
    let orderBy  = this.queryObject.orderBy;
    let limit    = app.getChildByIdr(this.widget, "limit").value;

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
    const th  = app.getChildByIdr(this.widget, "header").firstElementChild.children; // get collection of th

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
    <input type="button" value="Add" idr = "addButton" onclick="app.widget('addNode',this)">
    <input type="button" value="Search" idr = "searchButton" onclick="app.widgetSearch(this)">
    limit <input value ="9" idr = "limit" style="width: 20px;" onblur = "app.regression.logText(this)">

    <table>
      <thead idr = "header">
      <tr><th></th><th></th>#headerSearch#</tr>
      <tr><th>#</th><th>ID</th>#header#</tr>
      </thead>
      <tbody idr = "data"> </tbody>
    </table>
    <!-- popup goes here -->
    </div>
    `

    const strSearch = `
    <select idr = "dropdown#x#", onclick = "app.regression.logSearchChange(this)">
    <option value="S">S</option>
    <option value="M">M</option>
    <option value="E">E</option>
    <option value="=">=</option>
    </select></th>`

    const numSearch = `
    <select idr = "dropdown#x#" onclick = "app.regression.logSearchChange(this)">
    <option value=">">&gt;</option>
    <option value=">=">&gt;=</option>
    <option value="=">=</option>
    <option value="<=">&lt;=</option>
    <option value="<">&lt;</option>
    </select></th>`

  //  const html2 = app.idReplace(html,1);  // replace relative ids with absolute ids
  //  const html3 = html.replace('#tableName#',this.tableName); // This variable doesn't seem to exist

    // build search part of buildHeader
    let s="";
    for (let i=0; i<this.fieldsDisplayed.length; i++ ) {
        let fieldName =this.fieldsDisplayed[i];
        let s1 = `<th><input idr = "text` + i + `" db="fieldName: #1" size="7" onblur="app.regression.logText(this)">`
        if (this.fields[fieldName].type === "number") {
          // number search
          s1 += numSearch.replace('#x#', i);
        } else {
          // assume string search
          s1 += strSearch.replace('#x#', i);
        }
        s += s1.replace('#1',fieldName)
    }
    const html4 = html.replace('#headerSearch#',s)

    // build field name part of header
    let f="";
    for (let i=0; i<this.fieldsDisplayed.length; i++ ) {
        let fieldName =this.fieldsDisplayed[i];
        f += "<th onClick='app.widgetSort(this)'>"+ this.fields[fieldName].label + "</th>" ;
    }
    const html5 = html4.replace('#header#',f);

    /*
    Create new element, append to the widgets div in front of existing widgets
    */
    let parent = document.getElementById('widgets');
    let child = parent.firstElementChild;
    let newWidget = document.createElement('div'); // create placeholder div
    parent.insertBefore(newWidget, child); // Insert the new div before the first existing one
    newWidget.outerHTML = html5; // replace placeholder with the div that was just written
  }


  buildData(data) {  // build dynamic part of table
    this.queryData = data; // only one row should have been returned
    let html = "";
    const r = data;
    let rowCount = 1;
    var cell; // the cell currently being built
    var row; // the row currently being built
    var text; // the text to go in the cell
    var table = app.getChildByIdr(this.widget, "data");

    // Delete what's already in the table
    while (table.hasChildNodes()) {
      table.removeChild(table.firstChild);
    }

    for (let i=0; i<r.length; i++) {
      // Create a row
      row = document.createElement('tr');

      // Create a cell for rowCount and append it
      cell = document.createElement('td');
      text = document.createTextNode(rowCount++);
      cell.appendChild(text);
      row.appendChild(cell);

      // Create a cell for ID and append it
      cell = document.createElement('td');
      row.appendChild(cell);
      cell.outerHTML = `<td idr = "edit${i}" onClick="app.widget('edit',this)">${r[i]["n"].identity}</td>`;

      // For each display field, create a cell and append it
      for (let j=0; j<this.fieldsDisplayed.length; j++) {
        cell = document.createElement('td');
        let fieldName = this.fieldsDisplayed[j];
        text = document.createTextNode(r[i]["n"].properties[fieldName]);
        cell.appendChild(text);
        row.appendChild(cell);
      }

      // Append the whole row to the data table
      table.appendChild(row);
    }

    // New code for creating a JSON object
    let obj = {};
    obj.id = this.searchTrigger;
    if (obj.id == this.idWidget) { // If the call for the search came from this widget, then record the idr of the search button and that it was clicked.
      obj.idr = "searchButton";
      obj.action = "click";
    }
    if (obj.id == "menuNodes") { // If the call came from the menuNodes dropdown, then record the value of the dropDown and that it was selected.
      let dropDown = document.getElementById('menuNodes');
    	obj.value = dropDown.options[dropDown.selectedIndex].value;
      obj.action = "click";
    }
    if (obj.id == "New") { // If the call came from the New button, just record that it was clicked.
      obj.action = "click";
    }

    obj.data = JSON.parse(JSON.stringify(data)); // This should make a COPY of data, so deleting its identity won't affect the original.
    for (var i = 0; i< obj.data.length; i++) { // Trying to remove the IDs from the log - they're not particularly useful, and can cause problems because they rarely match
      delete obj.data[i].n.identity;
    }
    app.regression.log(JSON.stringify(obj));
    app.regression.record(obj);
  }


getatt(fieldName) {
  let ret = this.fields[fieldName].att
  if (!ret) {
    ret="";
  }
}


relationAdd(element) {
  alert(element.previousElementSibling.textContent)
}


edit(element){
  //  this.data.filter(o => o.n.identity===23)
    let id = element.innerHTML;
    let data = this.queryData;
    let n = data.filter(o => o.n.identity.toString() === id);

    app.widgetNodeNew(this.queryObject.nodeLabel,n[0].n);

    // log
    let obj = {};
    obj.id = app.widgetGetId(element);
    obj.idr = element.getAttribute("idr");
    obj.action = "click";
    app.regression.log(JSON.stringify(obj));
    app.regression.record(obj);
  }


  // open add widget
  addNode(element){
    app.widgetNodeNew(this.queryObject.nodeLabel);

    // log
    let obj = {};
    obj.id = app.widgetGetId(element);
    obj.idr = element.getAttribute("idr");
    obj.action = "click";
    app.regression.log(JSON.stringify(obj));
    app.regression.record(obj);
  }
} ////////////////////////////////////////////////////// end class widgetTableNodes
