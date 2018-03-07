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
    }}

}  /////// end method


initNodeData() { // move to DB in the future
///////////////////////////////////// ETPRI
this.node.people = {
   nodeLabel: "people"
  ,orderBy: "n.name, n.nameLast, n.nameFirst, n.email"
  ,fieldsDisplayed: ["name","nameLast", "nameFirst", "email"]
  ,fields: {
   "name":       {label: "Name" , att: `onclick="app.widget('relationAdd',this)"` }
  ,"nameLast":   {label: "Last Name" }
  ,"nameFirst":  {label: "First Name"}
  ,"email":      {label: "Email"     }
  ,"state":      {label: "State"     }
  ,"comment":    {label: "Comment"   }
  ,"newField":   {label: "newField"  }
  }}

this.node.organization = {
   nodeLabel: "organization"
  ,orderBy: "n.name, n.web"
  ,fieldsDisplayed: ["name", "web"]
  ,fields: {"name":       {label: "Name" }
    ,"web":      {label: "Web"}
    ,"comment":  {label: "Comment"  }
    ,"newField": {label: "newField"  }
  }}

this.node.topic = {
   nodeLabel: "topic"
  ,orderBy: "n.name, n.comment"
  ,fieldsDisplayed: ["name", "comment"]
  ,fields: {"name":       {label: "Name" }
    ,"comment":    {label: "Comment"}
    ,"newField":   {label: "newField"  }
  }}


this.node.address = {
  nodeLabel: "address"
  ,orderBy: "n.name, n.state, n.postalCode, n.city, n.street1, n.street2"
  ,fieldsDisplayed: ["name", "street1", "street2", "city", "state", "postalCode"]
  ,fields: {"name":       {label: "Name"}
  ,"street1":    {label: "Street"}
  ,"street2":    {label: ""  }
  ,"city":       {label: "City"  }
  ,"state":      {label: "State"  }
  ,"postalCode": {label: "Zip"  }
  ,"country":    {label: "Country"  }
  ,"comment":    {label: "Comment"  }
  }}

this.node.Test = {
  nodeLabel: "Test"
  ,orderBy: "n.name, n.field1, n.field2, n.field3"
  ,fieldsDisplayed: ["field1", "field2", "field3"]
  ,fields: {
    "name":     {label: "Name"}
    ,"field1":  {label: "First"}
    ,"field2":  {label: "Second"}
    ,"field3":  {label: "Third"}
  }
}

this.node.Test2 = {
  nodeLabel: "Test2"
  ,orderBy: "n.name, n.field1, n.field2, n.field3"
  ,fieldsDisplayed: ["field1", "field2", "field3"]
  ,fields: {
    "name":     {label: "Name"}
    ,"field1":  {label: "First"}
    ,"field2":  {label: "Second"}
    ,"field3":  {label: "Third"}
  }
}

} ////// end method

} ////////////////////////////////////////////////////// end class
