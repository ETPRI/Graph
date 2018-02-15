class dragDrop {
  constructor(containerID, buttonID, globalVar) {
    this.evntPrefix = "";
    if (globalVar) {    // If dragDrop itself isn't the global variable, pass in what IS and it will be added to onclick, onblur, etc. events.
                        // This is a kludge and only needs to last until I get this working with app.widget.
      this.evntPrefix = globalVar + ".";
    }

    let activeNode; // node which is being dragged
    this.domFunctions = new domFunctions();
    this.regression = new regressionTesting("dragDrop");

    // Set up Show/Hide button
    this.showHide = document.getElementById(buttonID);
    this.showHide.value = "Hide Input";
    this.showHide.setAttribute("onclick", `${this.evntPrefix}dragDrop.inputToggle(this)`);

    // Set up edit input
    const edit = document.createElement("input");
    edit.setAttribute("type", "text");
    edit.setAttribute("onblur", `${this.evntPrefix}dragDrop.save()`);
    edit.setAttribute("onkeydown", `${this.evntPrefix}dragDrop.LookForEnter(event, this)`);
    edit.setAttribute("hidden", "true");
    edit.setAttribute("id", "edit");
    document.body.appendChild(edit);

    this.container = document.getElementById(containerID);
    this.container.setAttribute("class", "widget");

    // This is where we start building the insert line. insertContainer is the outermost template tag (the draggable one) (or the only one, if they're not nested)
    this.insertContainer = this.container.lastElementChild;
    this.insertContainer.setAttribute("ondrop", `${this.evntPrefix}dragDrop.drop(event)`);
    this.insertContainer.setAttribute("ondragover", `${this.evntPrefix}dragDrop.allowDrop(event)`);
    this.insertContainer.setAttribute("draggable", "true");
    this.insertContainer.setAttribute("ondragstart", `${this.evntPrefix}dragDrop.drag(event)`);

    this.inputCount = 0;
    this.createInputs(this.insertContainer);
    this.contentCount = 0;

    // Make this.input the first input field
    // this.input = this.insertContainer;
    // while(this.input.hasChildNodes()) {
    //   this.input = this.input.firstElementChild;
    // }

    this.itemCount = 0; // number of finished items that have been added; also used for top-level idrs
  }

  createInputs(element) {
    if (element.hasChildNodes()) { // If this is not a leaf, process its children.
      let children = element.children;
      for (let child of children) {
        this.createInputs(child); // calls this recursively to process all leaves
      }
    }
    if (element.hasAttribute("editable")) { // Create inputs for each editable node
      let input = document.createElement("input");
      input.setAttribute("onchange", `${this.evntPrefix}dragDrop.recordText(this)`);
      input.setAttribute("onkeydown", `${this.evntPrefix}dragDrop.addOnEnter(event, this)`);
      input.setAttribute("idr", `input${this.inputCount++}`);
      element.insertBefore(input, element.firstChild);
    }
  }

  drag(evnt){ // sets value of activeNode
    this.activeNode = evnt.target;
    let obj = {};
    obj.id = this.domFunctions.widgetGetId(evnt.target);
    obj.idr = event.target.getAttribute("idr");
    obj.action = "dragstart";
    this.log(JSON.stringify(obj));
    this.regression.record(obj);
  }

  allowDrop(evnt){ // the event doesn't take its default action
  	evnt.preventDefault();
  }

  drop(evnt) { // drops the dwb node above or below the target. evnt is the drop event and its target is what's being dropped onto
  	evnt.preventDefault();
    let target = evnt.target;
    while (target.draggable == false) {
      target = target.parentNode;
    }

  	if (this.activeNode.offsetTop < target.offsetTop) {  // drag down
  		target.parentNode.insertBefore(this.activeNode, target.nextSibling); // Insert after target
  	}
    else { // drag up
  		target.parentNode.insertBefore(this.activeNode, target); // Insert before target
  	}
    const obj = {};
    obj.id = this.domFunctions.widgetGetId(evnt.target);
    obj.idr = target.getAttribute("idr");
    obj.action = "drop";
    this.log(JSON.stringify(obj));
    this.regression.record(obj);
  }

  LookForEnter(evnt, input) { // Makes hitting enter do the same thing as blurring (inserting a new node or changing an existing one)
    if (evnt.keyCode === 13) {
      input.onblur();
    }
  }

  insertElement(element) { // Element is all or part of insertContainer
    let newEl = element.cloneNode(false);

    if (element.hasChildNodes()) { // If this element has any children (may be inputs or nested elements)
      if (element.firstElementChild.tagName == "INPUT") { // If this element has an input child
        const input = element.firstElementChild; // Get the input inside it
        const text = input.value;
        newEl.appendChild(document.createTextNode(text)); // Copy text to the new node
        newEl.setAttribute("ondblclick", `${this.evntPrefix}dragDrop.edit(event)`  ); // make new node editable
        newEl.setAttribute("idr", `content${this.contentCount++}`);
        input.value = ""; // erase input
      }
      const children = element.children;
      for (let i=0; i<children.length; i++) {
        const childEl = this.insertElement(children[i]);
        if (childEl.tagName !== "INPUT") { // Don't duplicate the input itself
          newEl.appendChild(childEl);
        }
      }
    } // end if (element has children). No else - a node with no input and no child elements doesn't need processing.
    return newEl;
  }

  insert(input) { // Insert a new node
    let obj = {};
    obj.value = input.value;

    const newEl = this.insertElement(this.insertContainer); // Should create an appropriately nested element with data in leaves

    // Insert the new element before the input
    this.container.insertBefore(newEl, this.insertContainer);
    this.activeNode = newEl; // remember item that we are editing

    // set all the draggable functions
    newEl.setAttribute("ondrop"        ,`${this.evntPrefix}dragDrop.drop(event)`     );
    newEl.setAttribute("ondragover"    ,`${this.evntPrefix}dragDrop.allowDrop(event)`);
    newEl.setAttribute("ondragstart"   ,`${this.evntPrefix}dragDrop.drag(event)`     );
    newEl.draggable  = true;
    newEl.setAttribute("idr", `item${this.itemCount}`);

    let button = document.createElement("button");
    let text = document.createTextNode("X");
    button.appendChild(text);
    button.setAttribute("idr", `delete${this.itemCount++}`);
    button.setAttribute("onclick", `${this.evntPrefix}dragDrop.delete(this)`);
    newEl.appendChild(button);

    // logging
    obj.id = this.domFunctions.widgetGetId(input);
    obj.idr = input.getAttribute("idr");
    obj.action = "keydown";
    obj.key = "Enter";
    this.log(JSON.stringify(obj));
    this.regression.record(obj);

    // this.input.focus();
  }

  delete(button) {
    // logging
    let obj = {};
    obj.id = this.domFunctions.widgetGetId(button);
    obj.idr = button.getAttribute("idr");
    obj.action = "click";
    this.log(JSON.stringify(obj));
    this.regression.record(obj);

    let line = button.parentNode;
    line.parentNode.removeChild(line);
  }

  edit(evnt) { // edit an existing node
    this.activeNode = evnt.target;  // remember item that we are editing
    var closeButton;
    var hasClose = false;

    // This is a kludge! Fix if possible
    if (this.activeNode.children.length > 0) { // since only leaves are editable, this should be true ONLY if there's a close button attached
      closeButton = this.activeNode.firstElementChild;
      this.activeNode.removeChild(closeButton); // Temporarily remove the close button so it won't get caught up in textContent.
      closeButton.hidden = true;  // Also, hide it because clicking it while editing doesn't work
      hasClose = true;
    }

    // make input element visible
    var el = document.getElementById("edit");
    el.value = evnt.target.textContent;  // init value of input
    el.hidden = false;      // make input visible

    // Erase the text from the target (it will show up in ed instead)
    evnt.target.textContent = "";

    // Add the input element to the target
    evnt.target.appendChild(el);
    el.select();

    // Put the close button back
    if (hasClose) {
      evnt.target.appendChild(closeButton);
    }

    // Log
    let obj = {};
    obj.id = this.domFunctions.widgetGetId(evnt.target);
    obj.idr = event.target.getAttribute("idr");
    obj.action = "dblclick";
    this.log(JSON.stringify(obj));
    this.regression.record(obj);
  }

save(evnt){ // Save changes to a node
  var el = document.getElementById("edit");  // get input element
  el.hidden=true; 		 // hide input element
  let text = document.createTextNode(el.value);
  this.activeNode.insertBefore(text, el); // Add the input text to the selected node
  document.body.appendChild(el);           // move input field to end of body
  if (this.activeNode.children.length > 0) { // since only leaves are editable, this should be true ONLY if there's a close button attached
    let closeButton = this.activeNode.firstElementChild;
    closeButton.hidden = false;
  }

  // Log
  let obj = {};
  obj.id = el.id;
  obj.value = el.value;
  obj.action = "blur";
  this.log(JSON.stringify(obj));
  this.regression.record(obj);

  // this.input.focus(); // return focus to input
}

log(text) { // Add a message to the eventLog
    var ul = document.getElementById("eventLog");
    if (ul) {
      var li = document.createElement("li");
      li.appendChild(document.createTextNode(text));
      ul.appendChild(li);
    }
  }

  inputToggle(button) { // Toggles visibility of the input text box and value of the Show/Hide button.
    this.insertContainer.hidden = !this.insertContainer.hidden;
    if (this.insertContainer.hidden) {
      button.value = "Show input";
    }
    else {
      button.value = "Hide input";
      // this.input.focus();
    }

    // log
    let obj = {};
    obj.id = button.id;
    obj.action = "click";
    this.log(JSON.stringify(obj));
    this.regression.record(obj);
  }

  addOnEnter(evnt, input) {
    if (evnt.key == "Enter") {
      this.insert(input);
    }
  }

  recordText(input) {
    let obj = {};
    obj.id = this.domFunctions.widgetGetId(input);
    obj.idr = input.getAttribute("idr");
    obj.value = input.value;
    obj.action = "change";
    this.log(JSON.stringify(obj));
    this.regression.record(obj);
  }

  test() { // This is where I put code I'm testing and want to be able to fire at will. There's a test button on 1-drag.html to fire it.
  }
}
