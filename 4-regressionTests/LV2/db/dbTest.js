class dbTest {
  constructor() {
    this.db = new db();
    this.input = document.getElementById("input");
  }

  startQuery() { // runs when the user clicks the "run query" button; runs the query they typed and then calls finishedQuery
    this.db.setQuery(this.input.value);
    this.db.runQuery(this, "finishedQuery");
  }

  finishedQuery(data) { // runs when a query finishes. Just records and logs the result.
    let obj = {};
    obj.id = "run";
    obj.action = "click";
    obj.data = JSON.parse(JSON.stringify(data)); // copies the data so we can remove ids if needed

    for (let i = 0; i < data.length; i++) { // for every row returned, which may include whole nodes or relations with any name
      for (let fieldName in obj.data[i]) { // for every item in that row, which may BE a whole node or relation
        if ((obj.data[i][fieldName] instanceof Object) && ('identity' in obj.data[i][fieldName])) { // If that item is an object with an identity, delete it
          delete obj.data[i][fieldName].identity;
        }
        if ((obj.data[i][fieldName] instanceof Object) && ('start' in obj.data[i][fieldName])) { // If that item has a "start", which is another node's identity, delete it
          delete obj.data[i][fieldName].start;
        }
        if ((obj.data[i][fieldName] instanceof Object) && ('end' in obj.data[i][fieldName])) { // If that item has an "end", which is another node's identity, delete it
          delete obj.data[i][fieldName].end;
        }
      }
    }

    app.regression.record(obj);
    app.regression.log(JSON.stringify(obj));
  }

  queryChange(element) { // Runs when the user changes what is typed in the query box. Just records what they typed.
    let obj = {};
    obj.id = element.id;
    obj.value = element.value;
    obj.action = "change";
    app.regression.record(obj);
    app.regression.log(JSON.stringify(obj));
  }
}
