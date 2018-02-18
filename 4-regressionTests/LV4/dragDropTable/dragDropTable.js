class dragDropTable extends dragDrop {
  constructor(templateIDR, containerIDR, id, containerDOM, row, content) {
    const template = app.domFunctions.getChildByIdr(containerDOM, templateIDR); // the template should be the tr with the ths in it
    const container = app.domFunctions.getChildByIdr(containerDOM, containerIDR);

    let table = container;
    while (table.tagName !== 'TABLE' && table.parentElement) { // Look up for a table until you find one, or you reach the top of the DOM tree
      table = table.parentElement;
    }
    table.setAttribute("class", "widget");
    table.setAttribute("id", id.toString());

    function createInsertElement(templateEl) { // copies a template element, replacing th elements with td elements
      let newEl;
      if(templateEl.tagName == 'TH') { // Can't just clone it because we want to change the tag. Create a new element and copy the attributes instead
        newEl = document.createElement('TD');

        // Copy the attributes
        for (let i = templateEl.attributes.length - 1; i >= 0; --i) {
          const nodeName  = templateEl.attributes.item(i).nodeName;
          const nodeValue = templateEl.attributes.item(i).nodeValue;

          newEl.setAttribute(nodeName, nodeValue);
        }
      }
      else {
        newEl = templateEl.cloneNode(false);
      }

      newEl.removeAttribute("id");

      if (templateEl.hasChildNodes()) {
        const children = templateEl.children;
        for (let child of children) {
          newEl.appendChild(createInsertElement(child)); // calls this recursively to copy all the template's children and add them to the copy
        }
      }
      return newEl; // return the finished element
    } // End function (createInsertElement)

    const insertRow = createInsertElement(template); // Create the row to insert
    container.appendChild(insertRow); // append it to container
    const newCell = document.createElement('TH');
    const showHide = document.createElement('input');
    showHide.setAttribute("type", "button");
    showHide.setAttribute("idr", "showHide");
    newCell.appendChild(showHide);
    template.appendChild(newCell);

    super(containerIDR, "showHide", id, row, content); // After that point the original constructor should do the trick
  }

  createDelete(line) {
    const button = document.createElement("button");
    const text = document.createTextNode("Delete");
    button.appendChild(text);
    button.setAttribute("idr", `delete${this.itemCount++}`);
    button.setAttribute("onclick", "app.widget('delete', this)");
    const cell = document.createElement("td");
    cell.appendChild(button);
    line.appendChild(cell);
  }

  delete(button) {
    // logging
    let obj = {};
    obj.id = this.domFunctions.widgetGetId(button);
    obj.idr = button.getAttribute("idr");
    obj.action = "click";
    this.log(JSON.stringify(obj));
    app.regression.log(JSON.stringify(obj));
    app.regression.record(obj);

    let line = button.parentNode.parentNode;
    line.parentNode.removeChild(line);
  }
}
