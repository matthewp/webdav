var Resource = require('./resource');

module.exports = Root;

function Root() {
    /* although it subclasses from Resource this is merely a container */
}

this.Root.prototype = new Resource;