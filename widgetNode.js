/*

add/edit nodes in a form

*/

class widgetNode {
constructor(label, id) {
  this.id       =  id; // is db identifier,
  this.label    = label;
  this.idWidget = app.idGet(0);
  this.dom      = {};  // = document.getElementById(this.idWidget);
  this.fields   =
{
      name:  {label: "Name" , comment: "given name",  att: 'onclick="app.widget.edit(this)"'}
     ,born:  {label: "Born" , comment: "Sir name"  ,    }
     ,email: {label: "email", comment: "primary email"}  // should remove at someponit
}

  this.buildForm();
}


////////////////////////////////////////////////////////////////////
buildForm() { // public - build table header

const html =
`
<div id="#0#" class="widget" db="nameTable: #tableName#"><hr><b>
<input type="button" value="Close"   onclick="app.widgetClose(this)"> ` + this.label +` </b>
#addEdit#
<input type="button" value="Colapse" onclick="app.widgetCollapse(this)">
<table>
#tr#
</table>
</div>
`

const html1 = app.idReplace(html,0);

// putting in add or save button
let html2="";
if (this.id) {
  // id is defined, so we are doing an edit
  html2 = html1.replace('#addEdit#', '<input type="button" value="Save" onclick="app.widgetSave(this)">');
} else {
  // id is not defined, so we are doing an add
  html2 = html1.replace('#addEdit#', `<input type="button" value="Add"  onclick="app.widget('add',this)">`);
}

//
let s="";
for (var fieldName in this.fields) {
    let s1 = '<tr><th>' + this.fields[fieldName].label + '</th><td><input db="'+ fieldName +'"></td></tr>'
     s += s1;
}

 document.getElementById('widgets').innerHTML =
   html2.replace("#tr#", s)
   + document.getElementById('widgets').innerHTML;

this.dom = document.getElementById(this.idWidget);

if (this.id) {
  // doing an edit, popup fields with exsiting values
}

}


////////////////////////////////////////////////////////////////////
add(widgetElement) { // public - build table header
  // CREATE (:person {name:'David Bolt', lives:'Knoxville'})
  let tr     = this.dom.lastElementChild.firstElementChild.firstElementChild;

  const create = "create (:"+ this.label+" {#data#})";
  let data="";
  while (tr) {
    let inp = tr.lastElementChild.firstElementChild;

    data += inp.getAttribute("db") +":'" + inp.value +"', ";
    tr=tr.nextElementSibling;
  }


  let query = create.replace("#data#", data.substr(0,data.length-2) );
  let db = new db();
  document.getElementById('debug').value = query;

  this.session.run(query, {}).subscribe(this);
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

}
