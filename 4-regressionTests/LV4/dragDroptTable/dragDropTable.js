class dragDropTable extends dragDrop {
  constructor(templateID, containerID, buttonID, editID, recordID, replayID) {
    const template  = document.getElementById(templateID); // the template should be the tr with the ths in it
    const container = document.getElementById(containerID);

    function createInsertElement(templateEl) { // copies a template element, replacing th elements with td elements
      var newEl;
      if(templateEl.tagName == 'TH') {
        newEl = document.createElement('TD');
      } else {
        newEl = document.createElement(templateEl.tagName);
      }

      if (templateEl.hasChildNodes()) {
        let children = templateEl.children;
        for (let child of children) {
          newEl.appendChild(createInsertElement(child)); // calls this recursively to copy all the template's children and add them to the copy
        }
      }
      return newEl; // return the finished element
    }

    let insertRow = createInsertElement(template); // Create the row to insert
    container.appendChild(insertRow); // append it to container
    super(containerID, buttonID, editID, recordID, replayID); // After that point the original constructor should do the trick
  }
}
