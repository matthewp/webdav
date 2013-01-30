var SAXHandler = require('./sax_handler');

function LockinfoSAXHandler() {
  /* SAX handler to parse a LOCK response */
}

LockinfoSAXHandler.prototype = new SAXHandler;

LockinfoSAXHandler.prototype.startDocument = function () {
  this.lockInfo = {};
  this.currentItem = null;
  this.insideHref = false;
};

LockinfoSAXHandler.prototype.startElement = function (namespace, nodeName, attributes) {
  if (namespace == 'DAV:') {
    if (nodeName == 'locktype' ||
            nodeName == 'lockscope' ||
            nodeName == 'depth' ||
            nodeName == 'timeout' ||
            nodeName == 'owner' ||
            nodeName == 'locktoken') {
      this.currentItem = nodeName;
    } else if (nodeName == 'href') {
      this.insideHref = true;
    };
  };
};

LockinfoSAXHandler.prototype.endElement = function (namespace, nodeName) {
  if (namespace == 'DAV:') {
    if (nodeName == 'href') {
      this.insideHref = false;
    } else {
      this.currentItem = null;
    };
  };
};

LockinfoSAXHandler.prototype.characters = function (data) {
  if (this.currentItem &&
          (this.currentItem != 'owner' || this.insideHref) &&
          (this.currentItem != 'locktoken' || this.insideHref)) {
    this.lockInfo[this.currentItem] = data;
  };
};
