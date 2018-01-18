/*

move hard coded metaData to db at some point

*/

class metaData {
constructor () { // name of a query Object
  this.queryObjects = {}; // head of data
  this.metaDataInit();
}


get(name){
  return(this.queryObjects[name]);
}


metaDataInit() { // move to DB in the future
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
  ,orderBy: "name"
  ,fields: {
  	"name":  {label: "Name"}
   ,"born":  {label: "Born",  type: "number"  }
  }}

this.queryObjects.Movie = {
   nodeLabel: "Movie"
  ,orderBy: "nameLast"
  ,fields: {
  	"title":      {label: "Title"     }
    ,"released":  {label: "Released",  type: "number"}
    ,"tagline":   {label: "Tagline"   }
  }}

}


} ////////////////////////////////////////////////////// end class
