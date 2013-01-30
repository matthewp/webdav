module.exports = Resource;

function Resource(href, props) {
  /* a single resource in a multi-status tree */
  this.items = [];
  this.parent;
  this.properties = {}; // mapping from namespace to key/dom mappings
};