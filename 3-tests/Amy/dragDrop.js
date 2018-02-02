class dragDrop {
  constructor() {
    var dwb_node; // node which is being dragged
  }

  drag(ev){ // sets value of dwb_node
    this.dwb_node = ev.target;
  }

  allowDrop(ev){ // the event doesn't take its default action
  	ev.preventDefault();
  }

  drop(ev) { // drops the dwb node above or below the target. ev is the drop event and its target is what's being dropped onto
  	ev.preventDefault();
  	if (dwb_node.offsetTop < ev.target.offsetTop) {  // drag down
  		ev.target.parentNode.insertBefore(this.dwb_node, ev.target.nextSibling); // Insert after target
  	}
    else { // drag up
  		ev.target.parentNode.insertBefore(this.dwb_node, ev.target); // Insert before target
  	}
  }

  LookForEnter(ev, input) { // Makes hitting enter do the same thing as blurring (inserting a new node or changing an existing one)
    if (ev.keyCode === 13) {
      input.onblur();
    }
  }

  insert(input) { // Insert a new node
    this.log("insert");
    if (input.value === "") return;

    // Create new li with the text from the input box
    const newEl = document.createElement('li');
    newEl.appendChild(document.createTextNode(input.value));

    // Insert the new element before the input
    input.parentElement.parentElement.insertBefore(newEl, input.parentElement);

    // Reset the input text box to blank
    input.value = "";

    this.dwb_node = newEl; // remember <li> that we are editing

    // set all the draggable functions
    newEl.setAttribute("ondrop"        ,"dragDrop.drop(event)"     );
    newEl.setAttribute("ondragover"    ,"dragDrop.allowDrop(event)");
    newEl.setAttribute("ondragstart"   ,"dragDrop.drag(event)"     );
    newEl.setAttribute("ondblclick"    ,"dragDrop.edit(event)"  );
    newEl.draggable  = true;
  }

  edit(ev) { // edit an existing node
    this.log("edit")
    this.dwb_node = ev.target;  // remember <li> that we are editing

    // make input element visible
    var el = document.getElementById("ed");
    el.setAttribute("value", ev.target.textContent);  // init value of input
    el.setAttribute("type", "text");      // make input visible

    // Erase the text from the target (it will show up in ed instead)
    ev.target.textContent = "";

    // Add the input element to the target
    ev.target.appendChild(el);
    el.focus();
    el.select();
  }

save(ev){ // Save changes to a node
  this.log("save");
  var el = document.getElementById("ed");  // get input element
  el.setAttribute("type", "hidden"); 		 // hide input element
  document.body.appendChild(el)            // move input field to end of body
  if (el.value ==="" ) {
    this.dwb_node.parentElement.removeChild(this.dwb_node); // delete
  }
  else {
    this.dwb_node.textContent=el.value;			// update <li> with edited content
  }
  document.getElementById("insert").focus(); // return focus to input
}

log(s) { // Add a message to the eventLog
    var ul = document.getElementById("eventLog");
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(s));
    ul.appendChild(li);
  }
}
