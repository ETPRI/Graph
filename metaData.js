/*

move hard coded metaData to db at some point

*/

class metaData {
constructor () { // name of a query Object
  this.node     = {};  this.initNodeData();
  this.relation = {};  this.initRelationData();
}

getRelation(name){
  return(this.relation[name]);
}

getNode(name){
  return(this.node[name]);
}


/*

creater of the link
date created
date modified
date start
date end

types of links

*/

initRelationData(){
this.relation.link = {
     nodeLabel: "link"
    ,fields: {
    	"comment":   {label: "Comment"}
     ,"_trash":     {label: "Trash"  }
    }}

}  /////// end method


initNodeData() { // move to DB in the future
///////////////////////////////////// ETPRI
this.node.people = {
   nodeLabel: "people"
  ,orderBy: "n.nameLast"   // need to rewight this with ["nameLast",""]
  ,fieldsDisplayed: ["name","nameLast", "nameFirst", "email"]
  ,fields: {
   "name":       {label: "Name" , att: `onclick="app.widget('relationAdd',this)"` }
  ,"nameLast":   {label: "Last Name" }
  ,"nameFirst":  {label: "First Name"}
  ,"email":      {label: "Email"     }
  ,"state":      {label: "State"     }
  ,"comment":    {label: "Comment"   }
  ,"newField":   {label: "newField"  }
  ,"_trash":     {label: "Trash"     }
  }}

this.node.organization = {
   nodeLabel: "organization"
  ,orderBy: "n.name"
  ,fieldsDisplayed: ["name", "web"]
  ,fields: {"name":       {label: "Name" }
    ,"web":      {label: "Web"}
    ,"comment":  {label: "Comment"  }
    ,"newField": {label: "newField"  }
    ,"_trash":   {label: "Trash"}
  }}

this.node.topic = {
   nodeLabel: "topic"
  ,orderBy: "n.name"
  ,fieldsDisplayed: ["name", "comment"]
  ,fields: {"name":       {label: "Name" }
    ,"comment":    {label: "Comment"}
    ,"newField":   {label: "newField"  }
    ,"_trash": {label: "Trash"}
  }}


this.node.address = {
  nodeLabel: "address"
  ,orderBy: "n.state, n.postalCode, n.city, n.street1, n.street2"
  ,fieldsDisplayed: ["street1", "street2", "city", "state", "postalCode"]
  ,fields: {"street1":     {label: "Street"}
  ,"street2":    {label: ""  }
  ,"city":       {label: "City"  }
  ,"state":      {label: "State"  }
  ,"postalCode": {label: "Zip"  }
  ,"country":    {label: "Country"  }
  ,"comment":    {label: "Comment"  }
  ,"_trash":     {label: "Trash"  }
  }}

  this.node.Test = {
    nodeLabel: "Test"
    ,orderBy: "n.field1, n.field2, n.field3"
    ,fieldsDisplayed: ["field1", "field2", "field3"]
    ,fields: {
      "field1":   {label: "First"}
      ,"field2":  {label: "Second"}
      ,"field3":  {label: "Third"}
      ,"_trash":  {label: "Trash"}
    }
  }
} ////// end method

} ////////////////////////////////////////////////////// end class
