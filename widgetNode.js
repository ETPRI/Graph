/*

add/edit nodes in a form

*/

class widgetNode {
constructor(label, data) {
  this.data        = data; // is db identifier, not defined means add
  this.label       = label;
  this.idWidget    = app.idGet(0); // not sure this is used
  this.addSave     = app.idGet(1);
  this.addSaveDOM  = {} // button placeholder
  this.table       = app.idGet(2);
  this.tableDOM    = {} // placeholder, for form data
  this.queryObject = app.metaData.get(label);
  this.fields      = this.queryObject.fields;
  this.db          = new db() ; // placeholder for add

  this.buildWidget();
  this.buildData();
}


////////////////////////////////////////////////////////////////////
buildWidget() { // public - build table header
  const html =
  `
  <div id="#0#" class="widget"><hr>
  <input type="button" value="Close"   onclick="app.widgetClose(this)"><b> ` + this.label +` </b>
  <input id="#1#" type="button" onclick="app.widget('saveAdd',this)">
  <input type="button" value="Colapse" onclick="app.widgetCollapse(this)">
  <table id="#2#">
  </table>
  </div>
  `
  const html1 = app.idReplace(html,0);  // replace relative ids with absolute ids
  document.getElementById('widgets').innerHTML = html1
    + document.getElementById('widgets').innerHTML;

  this.addSaveDOM = document.getElementById(this.addSave);
  this.tableDOM   = document.getElementById(this.table);
}


buildData() {
  // put in one field label and input row for each field
  let html="";
  for (var fieldName in this.fields) {
      let s1 = '<tr><th>' + this.fields[fieldName].label + '</th><td><input db="' + fieldName
      + `" onChange="app.widget('changed',this)"`  +' #value#></td></tr>'
      let s2="";
      if (this.data) {
        // load form with data from db, edit
        let d=this.data.properties;
        s2 = s1.replace('#value#', "value='" + d[fieldName] + "'");  // edit, load data
      } else {
        s2 = s1.replace('#value#', '');  // add, no data to load
      }
       html += s2;
  }
  this.tableDOM.innerHTML = html;

  // set the button to be save or added
  if (this.data) {
    this.addSaveDOM.value = "Save";
  } else {
    this.addSaveDOM.value = "Add";
  }
}


saveAdd(widgetElement) {
  // director function
  if (widgetElement.value === "Save") {
    this.save(widgetElement);
  } else {
    this.add(widgetElement);
  }
}


////////////////////////////////////////////////////////////////////
add(widgetElement) { // public - build table header
  // CREATE (n:person {name:'David Bolt', lives:'Knoxville'}) return n

  let tr = this.tableDOM.firstElementChild.firstElementChild;

  const create = "create (n:"+ this.label+" {#data#}) return n";
  let data="";
  while (tr) {
    let inp = tr.lastElementChild.firstElementChild;

    data += inp.getAttribute("db") +":'" + inp.value +"', ";
    tr=tr.nextElementSibling;
  }


  const query = create.replace("#data#", data.substr(0,data.length-2) );
  this.db = new db();
  this.db.setQuery(query);
  this.db.runQuery(this,"addComplete");
}


addComplete(data) {
  this.data = data[0].n // takes single nodes
  this.buildData();
}


changed(input) {
  if (!this.data) return;  // no feedback in add mode

  // give visual feedback if edit data is different than db data
  if (input.value === this.data.properties[input.getAttribute('db')]) {
    input.setAttribute("class","");
  } else {
    input.setAttribute("class","changedData");
  }
}


save(widgetElement) { // public - build table header
/*
  MATCH (n)
  WHERE id(n)= 146
  SET n.born = 2003  // loop changed
  RETURN n
*/

  let tr = this.tableDOM.firstElementChild.firstElementChild;

  const create = "match (n) where id(n)=" +this.data.identity+ " set #data# return n";
  let data="";
  while (tr) {
    let inp = tr.lastElementChild.firstElementChild;  // find <input> element
    if(inp.getAttribute("class") === "changedData") {
      // create a set for this field
      let fieldName = inp.getAttribute("db")
      let d1 = "n."+ fieldName +"=#value#, ";
      let d2 = "";
      if (this.fields[fieldName].type === "number") {
        d2 = inp.value;  // number
      } else {
        d2 = '"' + inp.value + '"';  // assume string
      }
      data += d1.replace('#value#',d2)
    }
    tr=tr.nextElementSibling;
  }

  const query = create.replace("#data#", data.substr(0,data.length-2) );
  this.db = new db();
  this.db.setQuery(query);
  this.db.runQuery(this,"saveData");
}

saveData(data) {
  // redo from as edit now that data is saved
  this.data = data[0].n;
  this.buildData();
}

// ////////////////////////////////////////////////////////////////////
// getAtt(element,attName) { // private -----------
// 	/*
//   input - element - is DOM input Object
//           attName - name of attribute in db
//   return - attribute value from db
// 	*/
//   const ret = element.getAttribute("db").split(attName+":")[1].split(";")[0].trim();
// 	return(ret);
// }

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


}
