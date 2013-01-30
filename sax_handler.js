module.exports = SAXHandler;

function SAXHandler() {
  /* base-class and 'interface' for SAX handlers

      serves as documentation and base class so subclasses don't need
      to provide all methods themselves, but doesn't do anything
  */
};

SAXHandler.prototype.startDocument = function () {
  /* is called before the tree is parsed */
};

SAXHandler.prototype.startElement = function (namespaceURI, nodeName,
                                                attributes) {
  /* is called on encountering a new node

      namespace is the namespace of the node (URI, undefined if the node
      is not in a namespace), nodeName is the localName of the node,
      attributes is a mapping from namespace name to a mapping
      {name: value, ...}
  */
};

SAXHandler.prototype.endElement = function (namespaceURI, nodeName) {
  /* is called on leaving a node 
  
      namespace is the namespace of the node (URI, undefined if the node 
      is not defined inside a namespace), nodeName is the localName of 
      the node
  */
};

SAXHandler.prototype.characters = function (chars) {
  /* is called on encountering a textnode

      chars is the node's nodeValue
  */
};

SAXHandler.prototype.comment = function (comment) {
  /* is called when encountering a comment node

      comment is the node's nodeValue
  */
};

SAXHandler.prototype.endDocument = function () {
  /* is called after all nodes were visited */
};