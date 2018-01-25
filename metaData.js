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
  ,orderBy: "nameLast"
  ,fieldsDisplayed: ["nameLast", "nameFirst", "email"]
  ,fields: {"name":       {label: "Name"}
  ,"nameLast":   {label: "Last Name"}
  ,"nameFirst":  {label: "First Name"  }
  ,"email":      {label: "Email"  }
  ,"state":      {label: "State"  }
  ,"country":    {label: "Country"  }
  ,"_trash":     {label: "Trash"  }
  }}

this.node.address = {
  nodeLabel: "address"
  ,orderBy: "postalCode"
  ,fieldsDisplayed: ["street1", "street2", "city", "state"]
  ,fields: {"street1":     {label: "Street"}
  ,"street2":    {label: ""  }
  ,"city":       {label: "City"  }
  ,"state":      {label: "State"  }
  ,"postalCode":     {label: "Zip"  }
  ,"country":    {label: "Country"  }
  ,"comment":    {label: "Comment"  }
  ,"_trash":     {label: "Trash"  }
  }}

this.node.net = {
  nodeLabel: "net"
  ,orderBy: "nameLast"
  ,fieldsDisplayed: ["email.business", "facebook", "linkedIn"]
  ,fields: {"email.home":      {}
  ,"email.business": {}
  ,"facebook":       {}
  ,"linkedIn":       {}
  ,"state":          {}
  ,"country":        {}
  ,"comment":    {label: "Country"  }
  ,"_trash":     {label: "Trash"  }
  }}

this.node.phone = {
  nodeLabel: "phone"
  ,orderBy: "nameLast"
  ,fieldsDisplayed: ["home"]
  ,fields: {
  "home":        {}
  ,"street2":    {}
  ,"city":       {}
  ,"state":      {}
  ,"state":      {}
  ,"country":    {}
  ,"comment":    {}
  ,"_trash":     {}
  }}

this.node.organization = {
   nodeLabel: "organization"
  ,orderBy: "nameLast"
  ,fieldsDisplayed: ["nameLast", "nameFirst", "email", "state", "country"]
  ,fields: {"name":       {}
  ,"nameLast":   {}
   ,"nameFirst":  {}
   ,"email":      {}
   ,"state":      {}
   ,"country":    {}
   ,"_trash":     {}
  }}


/////////////////////////  sample DB
this.node.Person = {
   nodeLabel: "Person"
  ,orderBy: "name"
  ,fieldsDisplayed: ["name", "born"]
  ,fields: {
  	"name":  {label: "Name"}
   ,"born":  {label: "Born",  type: "number"  }
  }}

this.node.Movie = {
   nodeLabel: "Movie"
  ,orderBy: "nameLast"
  ,fieldsDisplayed: ["title", "released", "tagline"]
  ,fields: {
  	"title":      {label: "Title"     }
    ,"released":  {label: "Released",  type: "number"}
    ,"tagline":   {label: "Tagline"   }
  }}

} ////// end method


} ////////////////////////////////////////////////////// end class
