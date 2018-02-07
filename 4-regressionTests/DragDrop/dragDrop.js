class dragDrop {
  constructor(containerID, buttonID, editID, recordID, replayID) {
    var activeNode; // node which is being dragged
    this.domFunctions = new domFunctions();
    this.regression = new regressionTesting();

    // Set up Show/Hide button
    this.showHide = document.getElementById(buttonID);
    this.showHide.value = "Hide Input";
    this.showHide.setAttribute("onclick", "dragDrop.inputToggle(this)");

    // Set up edit input
    let edit = document.getElementById(editID);
    edit.setAttribute("type", "text");
    edit.setAttribute("onblur", "dragDrop.save()");
    edit.setAttribute("onkeydown", "dragDrop.LookForEnter(event, this)");
    edit.setAttribute("hidden", "true");

    // Set up record button
    let record = document.getElementById(recordID);
    record.setAttribute("value", "Record");
    record.setAttribute("onclick", "dragDrop.regression.recordToggle(this)");

    // Set up replay button
    let replay = document.getElementById(replayID);
    replay.setAttribute("value", "Replay");
    replay.setAttribute("onclick", "dragDrop.regression.play()");

    this.container = document.getElementById(containerID);
    this.container.setAttribute("class", "widget");

    // This is where we start building the insert line. insertContainer is the outermost template tag (the draggable one) (or the only one, if they're not nested)
    this.insertContainer = this.container.firstElementChild;
    this.insertContainer.setAttribute("ondrop", "dragDrop.drop(event)");
    this.insertContainer.setAttribute("ondragover", "dragDrop.allowDrop(event)");
    this.insertContainer.setAttribute("draggable", "true");
    this.insertContainer.setAttribute("ondragstart", "dragDrop.drag(event)");

    this.inputCount = 0;
    this.createInputs(this.insertContainer);
    this.contentCount = 0;

    // Make this.input the first input field
    this.input = this.insertContainer;
    while(this.input.hasChildNodes()) {
      this.input = this.input.firstElementChild;
    }

    this.itemCount = 0; // number of finished items that have been added; also used for top-level idrs
  }

  createInputs(element) {
    if (element.hasChildNodes()) { // If this is not a leaf, don't add an input, but do process its children.
      let children = element.children;
      for (let child of children) {
        this.createInputs(child); // calls this recursively to assign inputs to all leaves
      }
    }
    else { // Create inputs for each leaf node
      let input = document.createElement("input");
      input.setAttribute("onchange", "dragDrop.recordText(this)");
      input.setAttribute("onkeydown", "dragDrop.addOnEnter(event, this)");
      input.setAttribute("idr", `input${this.inputCount++}`);
      element.appendChild(input);
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
    let obj = {};
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

  insertElement(element) { // Obj is all or part of tagNames. Element is all or part of insertContainer
    let newEl = document.createElement(element.tagName);
    if (element.firstElementChild.tagName == "INPUT") { // If this is a "leaf"
      let input = element.firstElementChild; // Get the input inside it
      let text = input.value;
      newEl.appendChild(document.createTextNode(text));
      newEl.setAttribute("ondblclick"    ,"dragDrop.edit(event)"  ); // leaf nodes are editable
      newEl.setAttribute("idr", `content${this.contentCount++}`);
      input.value = ""; // erase input
    }
    else { // If this is a "branch"
      let children = element.children;
      for (let i=0; i<children.length; i++) {
        let childEl = this.insertElement(children[i]);
        newEl.appendChild(childEl);
      }
    }
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
    newEl.setAttribute("ondrop"        ,"dragDrop.drop(event)"     );
    newEl.setAttribute("ondragover"    ,"dragDrop.allowDrop(event)");
    newEl.setAttribute("ondragstart"   ,"dragDrop.drag(event)"     );
    newEl.draggable  = true;
    newEl.setAttribute("idr", `item${this.itemCount}`);

    let button = document.createElement("button");
    let text = document.createTextNode("X");
    button.appendChild(text);
    button.setAttribute("idr", `delete${this.itemCount++}`);
    button.setAttribute("onclick", "dragDrop.delete(this)");
    newEl.appendChild(button);

    // logging
    obj.id = this.domFunctions.widgetGetId(input);
    obj.idr = input.getAttribute("idr");
    obj.action = "keydown";
    obj.key = "Enter";
    this.log(JSON.stringify(obj));
    this.regression.record(obj);

    this.input.focus();
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

  this.input.focus(); // return focus to input
}

log(text) { // Add a message to the eventLog
    var ul = document.getElementById("eventLog");
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(text));
    ul.appendChild(li);
  }

  inputToggle(button) { // Toggles visibility of the input text box and value of the Show/Hide button.
    this.insertContainer.hidden = !this.insertContainer.hidden;
    if (this.insertContainer.hidden) {
      button.value = "Show input";
    }
    else {
      button.value = "Hide input";
      this.input.focus();
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
