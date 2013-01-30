var debug = require('./debug'),
    Resource = require('./resource'),
    SAXHandler = require('./sax_handler');

// XXX this whole thing is rather messy...
function MultiStatusSAXHandler() {
  /* SAX handler to parse a multi-status response */
}

MultiStatusSAXHandler.prototype = new SAXHandler;

MultiStatusSAXHandler.prototype.startDocument = function () {
  this.resources = [];
  this.depth = 0;
  this.current = null;
  this.current_node = null;
  this.current_prop_namespace = null;
  this.current_prop_name = null;
  this.current_prop_handler = null;
  this.prop_start_depth = null;
  // array with all nodenames to be able to build a path
  // to a node and check for parent and such
  this.elements = [];
};

MultiStatusSAXHandler.prototype.endDocument = function () {
  this.buildTree();
};

MultiStatusSAXHandler.prototype.startElement = function (namespace,
                                                    nodeName, attributes) {
  this.depth++;
  this.elements.push([namespace, nodeName]);
  debug('start: ' + namespace + ':' + nodeName);
  debug('parent: ' + (this.elements.length ?
                             this.elements[this.elements.length - 2] :
                             ''));
  if (this.current_node == 'property') {
    this.current_prop_handler.startElement(namespace, nodeName,
                                           attributes);
    return;
  };

  if (namespace == 'DAV:' && nodeName == 'response') {
    var resource = new Resource();
    if (this.current) {
      resource.parent = this.current;
    };
    this.current = resource;
    this.resources.push(resource);
  } else {
    var parent = this.elements[this.elements.length - 2];
    if (!parent) {
      return;
    };
    if (namespace == 'DAV:' && parent[0] == 'DAV:' &&
            parent[1] == 'response' || parent[1] == 'propstat') {
      // default response vars
      if (nodeName == 'href') {
        this.current_node = 'href';
      } else if (nodeName == 'status') {
        this.current_node = 'status';
      };
    } else if (parent[0] == 'DAV:' && parent[1] == 'prop') {
      // properties
      this.current_node = 'property';
      this.current_prop_namespace = namespace;
      this.current_prop_name = nodeName;
      // use a DOMHandler to propagate calls to for props
      this.current_prop_handler = new dommer.DOMHandler();
      this.current_prop_handler.startDocument();
      this.current_prop_handler.startElement(namespace, nodeName,
                                             attributes);
      this.start_prop_depth = this.depth;
      debug('start property');
    };
  };
};

MultiStatusSAXHandler.prototype.endElement = function (namespace,
                                                           nodeName) {
  debug('end: ' + namespace + ':' + nodeName);
  if (namespace == 'DAV:' && nodeName == 'response') {
    if (this.current) {
      this.current = this.current.parent;
    };
  } else if (this.current_node == 'property' &&
          namespace == this.current_prop_namespace &&
          nodeName == this.current_prop_name &&
          this.start_prop_depth == this.depth) {
    debug('end property');
    this.current_prop_handler.endElement(namespace, nodeName);
    this.current_prop_handler.endDocument();
    var dom = new dommer.DOM();
    var doc = dom.buildFromHandler(this.current_prop_handler);
    if (!this.current.properties[namespace]) {
      this.current.properties[namespace] = {};
    };
    this.current.properties[namespace][this.current_prop_name] = doc;
    this.current_prop_namespace = null;
    this.current_prop_name = null;
    this.current_prop_handler = null;
  } else if (this.current_node == 'property') {
    this.current_prop_handler.endElement(namespace, nodeName);
    this.depth--;
    this.elements.pop();
    return;
  };
  this.current_node = null;
  this.elements.pop();
  this.depth--;
};

MultiStatusSAXHandler.prototype.characters = function (data) {
  if (this.current_node) {
    if (this.current_node == 'status') {
      this.current[this.current_node] = data.split(' ')[1];
    } else if (this.current_node == 'href') {
      this.current[this.current_node] = data;
    } else if (this.current_node == 'property') {
      this.current_prop_handler.characters(data);
    };
  };
};

MultiStatusSAXHandler.prototype.buildTree = function () {
  /* builds a tree from the list of elements */
  // XXX Splitting this up wouldn't make it less readable,
  // I'd say...

  // first find root element
  var minlen = -1;
  var root;
  var rootpath;
  // var url_reg = /^.*:\/\/[^\/]*(\/.*)$/;
  for (var i = 0; i < this.resources.length; i++) {
    var resource = this.resources[i];
    resource.path = resource.href.split('/');
    if (resource.path[resource.path.length - 1] == '') {
      resource.path.pop();
    };
    var len = resource.path.length;
    if (minlen == -1 || len < minlen) {
      minlen = len;
      root = resource;
      root.parent = null;
    };
  };

  // now build the tree
  // first get a list without the root
  var elements = [];
  for (var i = 0; i < this.resources.length; i++) {
    var resource = this.resources[i];
    if (resource == root) {
      continue;
    };
    elements.push(resource);
  };
  while (elements.length) {
    var leftovers = [];
    for (var i = 0; i < elements.length; i++) {
      var resource = elements[i];
      var path = resource.path;
      var current = root;
      // we want to walk each element on the path to see if there's
      // a corresponding element already available, and if so 
      // continue walking until we find the parent element of the
      // resource
      if (path.length == root.path.length + 1) {
        root.items.push(resource);
        resource.parent = root;
      } else {
        // XXX still untested, and rather, ehrm, messy...
        for (var j = root.path.length; j < path.length - 1;
                j++) {
          for (var k = 0; k < current.items.length; k++) {
            var item = current.items[k];
            if (item.path[item.path.length - 1] ==
                    path[j]) {
              if (j == path.length - 2) {
                // we have a match at the end of the path
                // and all elements before that, this is 
                // the current resource's parent
                item.items.push(resource);
                resource.parent = item;
              } else {
                // a match means we this item is one in our
                // path to the root, follow it
                current = item;
              };
              break;
            };
          };
        };
        leftovers.push(resource);
      };
    };
    elements = leftovers;
  };

  this.root = root;
};