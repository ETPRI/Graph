/*

add/edit one node in a form

input: label
       data is optional.  Add mode is used if data is not supplied

*/

class widgetNode {
constructor(label, data) {
  this.data        = data; // is db identifier, not defined means add
  this.label       = label;
  this.idWidget    = app.idGet(0); // not sure this is used
  this.addSave     = app.idGet(1);
  this.addSaveDOM  = {} // place holder
  this.table       = app.idGet(2);
  this.tableDOM    = {} // place holder
  this.delete       = app.idGet(3);
  this.deleteDOM    = {} // place holder
  this.queryObject = app.metaData.getNode(label);
  this.fields      = this.queryObject.fields;
  this.db          = new db() ; // placeholder for add

  this.buildWidget();
  this.buildData();
}


////////////////////////////////////////////////////////////////////
buildWidget() { // public - build table header
  const html = app.widgetHeader() +'<b> ' + this.label +` </b>
  <input id="#1#" idr = "addSaveButton" type="button" onclick="app.widget('saveAdd',this)">
  <table id="#2#">
  </table>
  </div>
  `
  const html1 = app.idReplace(html,0);  // replace relative ids with absolute ids
  document.getElementById('widgets').innerHTML = html1
    + document.getElementById('widgets').innerHTML;

  this.addSaveDOM = document.getElementById(this.addSave);
  this.tableDOM   = document.getElementById(this.table);
  this.deleteDOM  = document.getElementById(this.delete);
}


buildData() {
  // put in one field label and input row for each field
  let html="";
  let fieldCount = 0;
  for (var fieldName in this.fields) {
      let s1 = '<tr><th>' + this.fields[fieldName].label + '</th><td><input db="' + fieldName
      + `" idr = "input` + fieldCount++ + `" onChange="app.widget('changed',this)"`  +' #value#></td></tr>'
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

  // log
  let obj = {};
  obj.id = app.widgetGetId(widgetElement);
  obj.idr = widgetElement.getAttribute("idr");
  obj.value = widgetElement.value;
  app.log(JSON.stringify(obj));
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
  if (!this.data) {
    let obj = {};
    obj.id = app.widgetGetId(input);
    obj.idr = input.getAttribute("idr");
    obj.value = input.value;
    app.log(JSON.stringify(obj));    
    return;  // no feedback in add mode, but do log the change
  }
  // give visual feedback if edit data is different than db data
  if (input.value === this.data.properties[input.getAttribute('db')]) {
    input.setAttribute("class","");
  } else {
    input.setAttribute("class","changedData");
  }

  // log
  let obj = {};
  obj.id = app.widgetGetId(input);
  obj.idr = input.getAttribute("idr");
  obj.value = input.value;
  app.log(JSON.stringify(obj));
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

// trash(domElememt) {
//   // set _trash = "comment why deleting" - remove from trash, removes the attribute
//   let comment = prompt("Reson for moving item to trash");
//   if (!comment) return;
//
//   let query = 'match (n) where id(n) =' + this.data.identity +
//   ' set _trash="' + comment +'"';
//   alert(query);
//   //this.data;
// }


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
