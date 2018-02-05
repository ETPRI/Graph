class dragDrop {
  constructor(containerID, buttonID) {
    var activeNode; // node which is being dragged
    this.showHide = document.getElementById(buttonID);
    this.showHide.value = "Hide Input";
    this.showHide.setAttribute("onmousedown", "app.dragDrop.inputToggle(this)");
    this.showHide.setAttribute("onclick", "app.dragDrop.inputFocusToggle(this)");

    this.container = document.getElementById(containerID);
    this.container.setAttribute("class", "widget");

    this.insertContainer = container.firstElementChild;
    this.insertContainer.setAttribute("ondrop", "app.dragDrop.drop(event)");
    this.insertContainer.setAttribute("ondragover", "app.dragDrop.allowDrop(event)");
    this.insertContainer.setAttribute("draggable", "true");
    this.insertContainer.setAttribute("ondragstart", "app.dragDrop.drag(event)");
    let text = document.createTextNode("Insert");
    this.insertContainer.appendChild(text);
    this.tagName = this.insertContainer.tagName;

    this.input = document.createElement("input");
    this.input.setAttribute("onblur", "app.dragDrop.insert(this)");
    this.input.setAttribute("onkeydown", "app.dragDrop.LookForEnter(event, this)");
    this.input.setAttribute("idr", "input");
    this.insertContainer.appendChild(this.input);

    this.itemCount = 0;
    this.inserting = true; // tracks whether the insert textbox is visible. I had to use a variable because the visibility wasn't changing fast enough to just check that.
  }

  drag(evnt){ // sets value of activeNode
    this.activeNode = evnt.target;
    let obj = {};
    obj.id = app.widgetGetId(evnt.target);
    obj.idr = event.target.getAttribute("idr");
    obj.action = "dragstart";
    this.log(JSON.stringify(obj));
    app.regression.record(obj);
  }

  allowDrop(evnt){ // the event doesn't take its default action
  	evnt.preventDefault();
  }

  drop(evnt) { // drops the dwb node above or below the target. evnt is the drop event and its target is what's being dropped onto
  	evnt.preventDefault();
  	if (this.activeNode.offsetTop < evnt.target.offsetTop) {  // drag down
  		evnt.target.parentNode.insertBefore(this.activeNode, evnt.target.nextSibling); // Insert after target
  	}
    else { // drag up
  		evnt.target.parentNode.insertBefore(this.activeNode, evnt.target); // Insert before target
  	}
    let obj = {};
    obj.id = app.widgetGetId(evnt.target);
    obj.idr = event.target.getAttribute("idr");
    obj.action = "drop";
    this.log(JSON.stringify(obj));
    app.regression.record(obj);
  }

  LookForEnter(evnt, input) { // Makes hitting enter do the same thing as blurring (inserting a new node or changing an existing one)
    if (evnt.keyCode === 13) {
      input.onblur();
    }
  }

  insert(input) { // Insert a new node
    let text = input.value;
    // DOES NOT insert if there is nothing in the text box OR if this.inserting is false
    if (text === "" || !this.inserting) {
      return;
    }

    // Create new li with the text from the input box
    const newEl = document.createElement(this.tagName);
    newEl.appendChild(document.createTextNode(text));

    // Insert the new element before the input
    input.parentElement.parentElement.insertBefore(newEl, input.parentElement);

    // Reset the input text box to blank
    input.value = "";

    this.activeNode = newEl; // remember <li> that we are editing

    // set all the draggable functions
    newEl.setAttribute("ondrop"        ,"app.dragDrop.drop(event)"     );
    newEl.setAttribute("ondragover"    ,"app.dragDrop.allowDrop(event)");
    newEl.setAttribute("ondragstart"   ,"app.dragDrop.drag(event)"     );
    newEl.setAttribute("ondblclick"    ,"app.dragDrop.edit(event)"  );
    newEl.draggable  = true;
    newEl.setAttribute("idr", "Item" + this.itemCount++);

    // logging
    let obj = {};
    obj.id = app.widgetGetId(input);
    obj.idr = input.getAttribute("idr");
    obj.value = text;
    obj.action = "blur";
    this.log(JSON.stringify(obj));
    app.regression.record(obj);
  }

  edit(evnt) { // edit an existing node
    this.log("edit")
    this.activeNode = evnt.target;  // remember <li> that we are editing

    // make input element visible
    var el = document.getElementById("edit");
    el.value = evnt.target.textContent;  // init value of input
    el.hidden = false;      // make input visible

    // Erase the text from the target (it will show up in ed instead)
    evnt.target.textContent = "";

    // Add the input element to the target
    evnt.target.appendChild(el);
    el.select();

    // Log
    let obj = {};
    obj.id = app.widgetGetId(evnt.target);
    obj.idr = event.target.getAttribute("idr");
    obj.action = "dblclick";
    this.log(JSON.stringify(obj));
    app.regression.record(obj);
  }

save(evnt){ // Save changes to a node
  var el = document.getElementById("edit");  // get input element
  el.hidden=true; 		 // hide input element
  document.body.appendChild(el)            // move input field to end of body
  if (el.value ==="" ) {
    this.activeNode.parentElement.removeChild(this.activeNode); // delete
  }
  else {
    this.activeNode.textContent=el.value;			// update <li> with edited content
  }
  let obj = {};
  obj.id = el.id;
  obj.value = el.value;
  obj.action = "blur";
  this.log(JSON.stringify(obj));
  app.regression.record(obj);

  this.input.focus(); // return focus to input
}

log(text) { // Add a message to the eventLog
    var ul = document.getElementById("eventLog");
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(text));
    ul.appendChild(li);
  }

  inputToggle(button) { // Toggles visibility of the input text box and value of the Show/Hide button. Called onmousedown so it will fire before the textbox blurs
    this.insertContainer.hidden = !this.insertContainer.hidden;
    if (this.insertContainer.hidden) {
      this.inserting = false;
      button.value = "Show input";
    }
    else {
      this.inserting = true;
      button.value = "Hide input";
    }

    // log
    let obj = {};
    obj.id = button.id;
    obj.action = "mousedown";
    this.log(JSON.stringify(obj));
    app.regression.record(obj);
  }

  // NOTE: This is the part of this code I'm least happy with. I tried giving the text box focus in inputToggle, but it was gaining focus
  // before it was finished becoming visible, and apparently when it became visible, it lost focus. I was forced to write this new function
  // and call it using onclick rather than onmousedown.
  inputFocusToggle(button) { // Focuses on the input text box when it becomes visible
    let obj = {};
    obj.id = button.id;
    obj.action = "click";
    this.log(JSON.stringify(obj));
    app.regression.record(obj);
    if (!this.insertContainer.hidden) {
      this.input.focus();
    }
  }

  test() {
    // Trying to programmatically drag and drop. Requires at least two elements; should swap the top two.
    let dragStartEvent = new Event("dragstart");
    let dropEvent = new Event("drop");
    let node1 = this.container.firstElementChild;
    let node2 = node1.nextElementSibling;
    node1.dispatchEvent(dragStartEvent);
    node2.dispatchEvent(dropEvent);
  }
}
