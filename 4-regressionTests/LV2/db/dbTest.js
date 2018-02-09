class dbTest {
  constructor() {
    this.db = new db();
    this.regression = new regressionTesting();
    this.input = document.getElementById("input");
  }

  startQuery() { // runs when the user clicks the "run query" button; runs the query they typed and then calls finishedQuery
    this.db.setQuery(this.input.value);
    this.db.runQuery(this, "finishedQuery");

    let obj = {};
    obj.id = "run";
    obj.action = "click";
    this.regression.record(obj);
    this.regression.log(JSON.stringify(obj));
  }
  finishedQuery(data) { // runs when a query finishes. Just records and logs the result.
    let obj = {};
    obj.data = data;
    this.regression.record(obj);
    this.regression.log(JSON.stringify(obj));
  }

  queryChange(element) {
    let obj = {};
    obj.id = element.id;
    obj.value = element.value;
    obj.action = "change";
    this.regression.record(obj);
    this.regression.log(JSON.stringify(obj));
  }
}
