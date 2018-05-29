class mindmapKeypress {
  constructor(parent) {
    this.parent = parent;
  }

  keyPressed(evnt) {
    if (evnt.target != this.parent.d3Functions.editDOM) {
      switch (evnt.which) {
        case 9:
          evnt.preventDefault();  // Don't jump around the page
          this.tabKey();
          break;
        case 13:
          this.enterKey();
          break;
        case 27:
          this.escapeKey();
          break;
        case 37:
          evnt.preventDefault(); // don't scroll
          this.leftArrow();
          break;
        case 38:
          evnt.preventDefault(); // Don't scroll
          this.upDownArrow(-1); // On an up arrow, go to the previous sibling - SUBTRACT 1 from current index
          break;
        case 39:
          evnt.preventDefault(); // don't scroll
          this.rightArrow();
          break;
        case 40:
          evnt.preventDefault(); // Don't scroll
          this.upDownArrow(1); // on a down arrow, go to the next sibling -- ADD 1 to current index
          break;
        case 46:
        case 8:
          this.deleteKey();
          break;
      }
    }
  }

  // Creates a new blank node which is a child of the selected node
  tabKey() {
    if (this.parent.selectedNode) {
      const nodeID = this.parent.selectedNode.getAttribute("idr").slice(5); // the IDR will be like groupxxx
      const nodeObj = this.parent.getObjFromID(nodeID); // Get the object representing this node

      if (nodeObj._children && nodeObj._children.length > 0) { // If the object has children, but they are hidden, show them.
        const button = this.parent.selectedNode.children[1]; // Every node group has five children - a node rect, a toggle rect,
        // a details rect, a details popup, and text - in that order. So the button is the child with index 1.
        this.parent.toggle(button);
        // The children, if any, should now be visible, and the object should have a children array.
      }

      const child = this.parent.newObj(); // Create a new blank label object...
      child.parent = nodeID;
      nodeObj.children.push(child); // make it a new child of the selected node...
      this.parent.d3Functions.update(); // and redraw the graphic.
    }
  }

  // If NOT currently editing a node (in which case, hitting Enter just means "Done editing"),
  // or its notes (in which case, hitting Enter just starts a new line),
  // create a new younger sibling for the node.
  enterKey() {
    if (this.parent.selectedNode && this.parent.notesText.hidden == true) {
      const nodeID = this.parent.selectedNode.getAttribute("idr").slice(5); // the IDR will be like groupxxx
      const nodeObj = this.parent.getObjFromID(nodeID); // Get the object representing this node
      const parentID = nodeObj.parent;
      if (parentID != "null") { // IF the selected node has a parent, it can have siblings
      const parent = this.parent.getObjFromID(parentID);
        const child = this.parent.newObj();

        const index = parent.children.indexOf(nodeObj) + 1; // Insert in the NEXT position, to come after the previous sibling
        parent.children.splice(index, 0, child);
        child.parent = parentID;
        this.parent.d3Functions.update();
      }
    }
  }

  // deselects the selected node
  escapeKey() {
    if (this.parent.selectedNode) {
      this.parent.selectedNode.classList.remove("selected");
      this.parent.selectedNode = null;
      this.parent.d3Functions.update();
    }
  }

  // Deletes the selected node and all of its children
  deleteKey() {
    if (this.parent.selectedNode && !this.parent.notesLabel) {
      const nodeID = this.parent.selectedNode.getAttribute("idr").slice(5); // the IDR will be like groupxxx
      // Remove the onmouseout from everything in the group, to avoid triggering it when the group disappears
      const prefixes = ["node", "toggle", "note", "detail"];
      for (let i = 0; i < prefixes.length; i++) {
        const idr = prefixes[i] + nodeID;
        const element = app.domFunctions.getChildByIdr(this.parent.SVG_DOM, idr);
        element.removeAttribute("onmouseout");
      }
      const nodeObj = this.parent.getObjFromID(nodeID); // Get the object representing this node
      const parentID = nodeObj.parent;
      if (parentID != "null") { // If the object has a parent, remove it from its parent's children array
        const parentObj = this.parent.getObjFromID(parentID);
        const parentIndex = parentObj.children.indexOf(nodeObj);
        if(parentIndex != -1) {
          parentObj.children.splice(parentIndex, 1);
        }
      }
      else { // If the object is a root, remove it from the roots array
        const rootIndex = this.parent.d3Functions.roots.indexOf(nodeObj);
        if(rootIndex != -1) {
          this.parent.d3Functions.roots.splice(rootIndex, 1);
        }
      }
      this.parent.selectedNode = null;
      this.parent.d3Functions.update();
    }
  }

  // Selects the parent of the selected node
  leftArrow() {
    if (this.parent.selectedNode) {
      const nodeID = this.parent.selectedNode.getAttribute("idr").slice(5); // the IDR will be like groupxxx
      const nodeObj = this.parent.getObjFromID(nodeID); // Get the object representing this node
      const parentID = nodeObj.parent;
      if (parentID != "null") { // If the object has a parent, select the parent
        const parentGroup = app.domFunctions.getChildByIdr(this.parent.SVG_DOM, `group${parentID}`);
        this.parent.makeSelectedNode(parentGroup);
        this.parent.d3Functions.update();
      }
    }
  }

  // Selects the first child of the selected node
  rightArrow() {
    if (this.parent.selectedNode) {
      const nodeID = this.parent.selectedNode.getAttribute("idr").slice(5); // the IDR will be like groupxxx
      const nodeObj = this.parent.getObjFromID(nodeID); // Get the object representing this node
        if (nodeObj._children && nodeObj._children.length > 0) { // If the object has children, but they are hidden, show them.
          const button = this.parent.selectedNode.children[1]; // Every node group has five children - a node rect, a toggle rect,
          // a details rect, a details popup, and text - in that order. So the button is the child with index 1.
          this.parent.toggle(button);
          // The children, if any, should now be visible.
        }
      if (nodeObj.children && nodeObj.children.length > 0) { // If the object has children, select the oldest child
        const childObj = nodeObj.children[0];
        const childID = childObj.id;
        const childGroup = app.domFunctions.getChildByIdr(this.parent.SVG_DOM, `group${childID}`);
        this.parent.makeSelectedNode(childGroup);
        this.parent.d3Functions.update();
      }
    }
  }

  // Go to the previous sibling, if any. If this is the first sibling, cycle around to the last one.
  upDownArrow(offset) {
    if (this.parent.selectedNode) {
      const nodeID = this.parent.selectedNode.getAttribute("idr").slice(5); // the IDR will be like groupxxx
      const nodeObj = this.parent.getObjFromID(nodeID); // Get the object representing this node
      const parentID = nodeObj.parent;
      if (parentID != "null") { // If the object has a parent, we can cycle through its siblings, if any
        const parentObj = this.parent.getObjFromID(parentID);
        const parentIndex = parentObj.children.indexOf(nodeObj);
        let newIndex = parentIndex + offset; // Add 1 to the index to go forward (down arrow). Subtract 1 to go back (up arrow)

        // If we go too far backwards, the index will be -1. Cycle around to the last item
        if (newIndex == -1) {
          newIndex = parentObj.children.length - 1;
        }

        // If we go too far forward, the index will be equal to the array length. Cycle around to the first item.
        if (newIndex == parentObj.children.length) {
          newIndex = 0;
        }

        const siblingObj = parentObj.children[newIndex];
        const siblingID = siblingObj.id;
        const siblingGroup = app.domFunctions.getChildByIdr(this.parent.SVG_DOM, `group${siblingID}`);

        this.parent.makeSelectedNode(siblingGroup);
      }
      this.parent.d3Functions.update();
    }
  }
}
