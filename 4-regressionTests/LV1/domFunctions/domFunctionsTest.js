class domFunctionsTest {
  constructor() {
    this.idrText = document.getElementById("IDRtext");
    this.top = document.getElementById("topWidget");
    this.bottom = document.getElementById("bottomWidget");
  }
  textChange(element) { // runs when the user changes a text box. Just records the change.
    let obj = {};
    obj.id = element.id;
    obj.value = element.value;
    obj.action = "change";
    app.regression.log(JSON.stringify(obj));
    app.regression.record(obj);
  }
  searchIDR(button) { // runs when the user clicks the Search button. Logs the fields it finds as "data".
    let fields = [];
    let idr = this.idrText.value;

    let textBox = app.domFunctions.getChildByIdr(this.top, idr);
    if (textBox) {
      fields.push(textBox.id);
    }
    else fields.push(null);

    textBox = app.domFunctions.getChildByIdr(this.bottom, idr);
    if (textBox) {
      fields.push(textBox.id);
    }
    else fields.push(null);

    let obj = {};
    obj.id = button.id;
    obj.action = "click";
    obj.data = fields;
    app.regression.log(JSON.stringify(obj));
    app.regression.record(obj);
  }
  getId(element) { // runs when the user searches for a button's widgetID by clicking it. Writes the IDR in the text box and logs it as "data".
    let id = app.domFunctions.widgetGetId(element);

    let obj = {};
    obj.id = element.id;
    obj.action="click";
    obj.data=id;
    app.regression.log(JSON.stringify(obj));
    app.regression.record(obj);
  }
}
