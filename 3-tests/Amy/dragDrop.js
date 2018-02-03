class dragDrop {
  constructor() {
    var activeNode; // node which is being dragged
    this.input = document.getElementById("insert");
    this.inputLine = this.input.parentElement;
    this.inserting = true; // tracks whether the insert textbox is visible. I had to use a variable because the visibility wasn't changing fast enough to just check that.
  }

  drag(evnt){ // sets value of activeNode
    this.activeNode = evnt.target;
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
  }

  LookForEnter(evnt, input) { // Makes hitting enter do the same thing as blurring (inserting a new node or changing an existing one)
    if (evnt.keyCode === 13) {
      input.onblur();
    }
  }

  insert(input) { // Insert a new node
    // DOES NOT insert if there is nothing in the text box OR if this.inserting is false
    if (input.value === "" || !this.inserting) {
      this.log("Blank insert");
      return;
    }

    // Create new li with the text from the input box
    const newEl = document.createElement('li');
    newEl.appendChild(document.createTextNode(input.value));

    // Insert the new element before the input
    input.parentElement.parentElement.insertBefore(newEl, input.parentElement);

    // Reset the input text box to blank
    input.value = "";

    this.activeNode = newEl; // remember <li> that we are editing

    // set all the draggable functions
    newEl.setAttribute("ondrop"        ,"dragDrop.drop(event)"     );
    newEl.setAttribute("ondragover"    ,"dragDrop.allowDrop(event)");
    newEl.setAttribute("ondragstart"   ,"dragDrop.drag(event)"     );
    newEl.setAttribute("ondblclick"    ,"dragDrop.edit(event)"  );
    newEl.draggable  = true;

    this.log("insert");
  }

  edit(evnt) { // edit an existing node
    this.log("edit")
    this.activeNode = evnt.target;  // remember <li> that we are editing

    // make input element visible
    var el = document.getElementById("edit");
    el.setAttribute("value", evnt.target.textContent);  // init value of input
    el.hidden = false;      // make input visible

    // Erase the text from the target (it will show up in ed instead)
    evnt.target.textContent = "";

    // Add the input element to the target
    evnt.target.appendChild(el);
    el.select();
  }

save(evnt){ // Save changes to a node
  var el = document.getElementById("edit");  // get input element
  el.hidden=true; 		 // hide input element
  document.body.appendChild(el)            // move input field to end of body
  if (el.value ==="" ) {
    this.activeNode.parentElement.removeChild(this.activeNode); // delete
    this.log("delete");
  }
  else {
    this.log("save");
    this.activeNode.textContent=el.value;			// update <li> with edited content
  }
  document.getElementById("insert").focus(); // return focus to input
}

log(text) { // Add a message to the eventLog
    var ul = document.getElementById("eventLog");
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(text));
    ul.appendChild(li);
  }

  inputToggle(button) { // Toggles visibility of the input text box and value of the Show/Hide button. Called onmousedown so it will fire before the textbox blurs
    this.inputLine.hidden = !this.inputLine.hidden;
    if (this.inputLine.hidden) {
      this.inserting = false;
      button.value = "Show input";
    }
    else {
      this.inserting = true;
      button.value = "Hide input";
    }
  }

  // NOTE: This is the part of this code I'm least happy with. I tried giving the text box focus in inputToggle, but it was gaining focus
  // before it was finished becoming visible, and apparently when it became visible, it lost focus. I was forced to write this new function
  // and call it using onclick rather than onmousedown.
  inputFocusToggle() { // Focuses on the input text box when it becomes visible
    if (!this.inputLine.hidden) {
      this.input.focus();
    }
  }
}
