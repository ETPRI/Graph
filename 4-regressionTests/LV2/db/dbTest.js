class dbTest {
  constructor() {
    this.db = new db();
    this.input = document.getElementById("input");
  }

  startQuery() { // runs when the user clicks the "run query" button; runs the query they typed and then calls finishedQuery
    this.db.setQuery(this.input.value);
    this.db.runQuery(this, "finishedQuery");

    let obj = {};
    obj.id = "run";
    obj.action = "click";
    app.regression.record(obj);
    app.regression.log(JSON.stringify(obj));
  }
  finishedQuery(data) { // runs when a query finishes. Just records and logs the result.
    let obj = {};
    obj.data = data;
    app.regression.record(obj);
    app.regression.log(JSON.stringify(obj));
  }

  queryChange(element) {
    let obj = {};
    obj.id = element.id;
    obj.value = element.value;
    obj.action = "change";
    app.regression.record(obj);
    app.regression.log(JSON.stringify(obj));
  }
}
