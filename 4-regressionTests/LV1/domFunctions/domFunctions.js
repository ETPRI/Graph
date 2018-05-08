class domFunctions {
  constructor() {}

  getChildByIdr(element, idr) {
    const children = Array.from(element.children); // Get the element's children
    while (children.length > 0) {
      const child = children.pop(); // For each child...
      if (child.getAttribute("idr") == idr) {
        return child; // If the idr matches, return the element...
      }
      else if (!child.classList.contains("widget") && child.children.length > 0) { // If the child is not a widget itself, and it has children...
        children.push(...child.children); // add its children to the children array
      }
    }
  	return null; // return null if no idr matches
  }

  widgetGetId(domElement) {
  	/* input - domElememt inside a widget
  	   return - string id associated with widget
  	*/
  	// go up the dom until class="widget" is found,
  	// grap the id and
  	if (domElement.getAttribute("class") == "widget") {
  		// found start of widget
  		return(domElement.getAttribute("id"));
  	}
    else if (domElement.parentElement){ // if the parent element exists - if we haven't gone all the way up the tree looking for a widget
  		return(this.widgetGetId(domElement.parentElement));
  	}
    else {
      alert ("Error: Searched for the widget ID of an element which is not in a widget.");
      return null;
    }

  	/* need some error processing if the original domElememt passed is not inside a widget,
  	or if there is a widget construction error and the class was not placed there */

    // I took a first shot at it - we'll see how it works. -AMF
  }
}
