class domFunctions {
  constructor() {}

  getChildByIdr(element, idr) {
  	let children = element.querySelectorAll("*"); // get all the element's children...
  	for (let i = 0; i < children.length; i++) { // loop through them...
  		//alert("Checking child " + i + " of widget ID " + element.id + "; idr = " + children[i].getAttribute("idr") + "; target: " + idr);
  		if (children[i].getAttribute("idr") == idr) {
  			return children[i]; // and return the first one whose idr matches...
  		}
  	}
  	return null; // or null if no idr matches
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
