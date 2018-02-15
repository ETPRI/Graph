class dragDropTable extends dragDrop {
  constructor(templateID, containerID, globalVar) {
    const template = document.getElementById(templateID); // the template should be the tr with the ths in it
    const container = document.getElementById(containerID);

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
    showHide.setAttribute("id", "showHide");
    newCell.appendChild(showHide);
    template.appendChild(newCell);

    super(containerID, "showHide", globalVar); // After that point the original constructor should do the trick
  }
}
