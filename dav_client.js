var LockinfoSAXHandler = require('./lockinfo_sax_handler'),
    MultiStatusSaxHandler = require('./multi_status_sax_handler'),
    STATUS_CODES = require('./status_codes'),
    xobj = require('xhr');

module.exports = DavClient;

function DavClient() {

}

DavClient.prototype.initialize = function (host, port, protocol) {
  /* the 'constructor' (needs to be called explicitly!!) 
      
      host - the host name or IP
      port - HTTP port of the host (optional, defaults to 80)
      protocol - protocol part of URLs (optional, defaults to http)
  */
  this.host = host || location.hostname;
  this.port = port || location.port || 80;
  this.protocol = (protocol ||
                    location.protocol.substr(0,
                                            location.protocol.length - 1
                                            ) ||
                    'http');
  this.request = null;
};

this.DavClient.prototype.OPTIONS = function (path, handler, context) {
  /* perform an OPTIONS request

      find out which HTTP methods are understood by the server
  */
  // XXX how does this work with * paths?
  var request = this._getRequest('OPTIONS', path, handler, context);
  request.send('');
};

this.DavClient.prototype.GET = function (path, handler, context) {
  /* perform a GET request 
      
      retrieve the contents of a resource
  */
  var request = this._getRequest('GET', path, handler, context);
  request.send('');
};

this.DavClient.prototype.PUT = function (path, content, handler,
                                        context, locktoken) {
  /* perform a PUT request 
      
      save the contents of a resource to the server

      'content' - the contents of the resource
  */
  var request = this._getRequest('PUT', path, handler, context);
  request.setRequestHeader("Content-type", "text/xml,charset=UTF-8");
  if (locktoken) {
    request.setRequestHeader('If', '<' + locktoken + '>');
  };
  request.send(content);
};

this.DavClient.prototype.DELETE = function (path, handler,
                                            context, locktoken) {
  /* perform a DELETE request 
      
      remove a resource (recursively)
  */
  var request = this._getRequest('DELETE', path, handler, context);
  if (locktoken) {
    request.setRequestHeader('If', '<' + locktoken + '>');
  };
  //request.setRequestHeader("Depth", "Infinity");
  request.send('');
};

this.DavClient.prototype.MKCOL = function (path, handler,
                                          context, locktoken) {
  /* perform a MKCOL request

      create a collection
  */
  var request = this._getRequest('MKCOL', path, handler, context);
  if (locktoken) {
    request.setRequestHeader('If', '<' + locktoken + '>');
  };
  request.send('');
};

this.DavClient.prototype.COPY = function (path, topath, handler,
                                          context, overwrite, locktoken) {
  /* perform a COPY request

      create a copy of a resource

      'topath' - the path to copy the resource to
      'overwrite' - whether or not to fail when the resource 
              already exists (optional)
  */
  var request = this._getRequest('COPY', path, handler, context);
  var tourl = this._generateUrl(topath);
  request.setRequestHeader("Destination", tourl);
  if (overwrite) {
    request.setRequestHeader("Overwrite", "F");
  };
  if (locktoken) {
    request.setRequestHeader('If', '<' + locktoken + '>');
  };
  request.send('');
};

this.DavClient.prototype.MOVE = function (path, topath, handler,
                                          context, overwrite, locktoken) {
  /* perform a MOVE request

      move a resource from location

      'topath' - the path to move the resource to
      'overwrite' - whether or not to fail when the resource
              already exists (optional)
  */
  var request = this._getRequest('MOVE', path, handler, context);
  var tourl = this._generateUrl(topath);
  request.setRequestHeader("Destination", tourl);
  if (overwrite) {
    request.setRequestHeader("Overwrite", "F");
  };
  if (locktoken) {
    request.setRequestHeader('If', '<' + locktoken + '>');
  };
  request.send('');
};

this.DavClient.prototype.PROPFIND = function (path, handler,
                                              context, depth) {
  /* perform a PROPFIND request

      read the metadata of a resource (optionally including its children)

      'depth' - control recursion depth, default 0 (only returning the
              properties for the resource itself)
  */
  var request = this._getRequest('PROPFIND', path, handler, context);
  depth = depth || 0;
  request.setRequestHeader('Depth', depth);
  request.setRequestHeader('Content-type', 'text/xml; charset=UTF-8');
  // XXX maybe we want to change this to allow getting selected props
  var xml = '<?xml version="1.0" encoding="UTF-8" ?>' +
              '<D:propfind xmlns:D="DAV:">' +
              '<D:allprop />' +
              '</D:propfind>';
  request.send(xml);
};

// XXX not sure about the order of the args here
this.DavClient.prototype.PROPPATCH = function (path, handler, context,
                                              setprops, delprops,
                                              locktoken) {
  /* perform a PROPPATCH request

      set the metadata of a (single) resource

      'setprops' - a mapping {<namespace>: {<key>: <value>}} of
              variables to set
      'delprops' - a mapping {<namespace>: [<key>]} of variables
              to delete
  */
  var request = this._getRequest('PROPPATCH', path, handler, context);
  request.setRequestHeader('Content-type', 'text/xml; charset=UTF-8');
  if (locktoken) {
    request.setRequestHeader('If', '<' + locktoken + '>');
  };
  var xml = this._getProppatchXml(setprops, delprops);
  request.send(xml);
};

this.DavClient.prototype.LOCK = function (path, owner, handler, context,
                                          scope, type, depth, timeout,
                                          locktoken) {
  /* perform a LOCK request

      set a lock on a resource

      'owner' - a URL to identify the owner of the lock to be set
      'scope' - the scope of the lock, can be 'exclusive' or 'shared'
      'type' - the type of lock, can be 'write' (somewhat strange, eh?)
      'depth' - can be used to lock (part of) a branch (use 'infinity' as
                  value) or just a single target (default)
      'timeout' - set the timeout in seconds
  */
  if (!scope) {
    scope = 'exclusive';
  };
  if (!type) {
    type = 'write';
  };
  var request = this._getRequest('LOCK', path, handler, context);
  if (depth) {
    request.setRequestHeader('Depth', depth);
  };
  if (!timeout) {
    timeout = "Infinite, Second-4100000000";
  } else {
    timeout = 'Second-' + timeout;
  };
  if (locktoken) {
    request.setRequestHeader('If', '<' + locktoken + '>');
  };
  request.setRequestHeader("Content-Type", "text/xml; charset=UTF-8");
  request.setRequestHeader('Timeout', timeout);
  var xml = this._getLockXml(owner, scope, type);
  request.send(xml);
};

this.DavClient.prototype.UNLOCK = function (path, locktoken,
                                            handler, context) {
  /* perform an UNLOCK request

      unlock a previously locked file

      'token' - the opaque lock token, as can be retrieved from 
                  content.locktoken using a LOCK request.
  */
  var request = this._getRequest('UNLOCK', path, handler, context);
  request.setRequestHeader("Lock-Token", '<' + locktoken + '>');
  request.send('');
};

this.DavClient.prototype._getRequest = function (method, path,
                                                handler, context) {
  /* prepare a request */
  var request = xobj();
  if (method == 'LOCK') {
    // LOCK requires parsing of the body on 200, so has to be treated
    // differently
    request.onreadystatechange = this._wrapLockHandler(handler,
                                                    request, context);
  } else {
    request.onreadystatechange = this._wrapHandler(handler,
                                                    request, context);
  };
  var url = this._generateUrl(path);
  request.open(method, url, true);
  // refuse all encoding, since the browsers don't seem to support it...
  request.setRequestHeader('Accept-Encoding', ' ');
  return request
};

this.DavClient.prototype._wrapHandler = function (handler, request,
                                                  context) {
  /* wrap the handler with a callback

      The callback handles multi-status parsing and calls the client's
      handler when done
  */
  var self = this;
  function HandlerWrapper() {
    this.execute = function () {
      if (request.readyState == 4) {
        var status = request.status.toString();
        var headers = self._parseHeaders(
                            request.getAllResponseHeaders());
        var content = request.responseText;
        if (status == '207') {
          content = self._parseMultiStatus(content);
        };
        var statusstring = STATUS_CODES[status];
        handler.call(context, status, statusstring,
                        content, headers);
      };
    };
  };
  return (new HandlerWrapper().execute);
};

this.DavClient.prototype._wrapLockHandler = function (handler, request,
                                                      context) {
  /* wrap the handler for a LOCK response

      The callback handles parsing of specific XML for LOCK requests
  */
  var self = this;
  function HandlerWrapper() {
    this.execute = function () {
      if (request.readyState == 4) {
        var status = request.status.toString();
        var headers = self._parseHeaders(
                            request.getAllResponseHeaders());
        var content = request.responseText;
        if (status == '200') {
          content = self._parseLockinfo(content);
        } else if (status == '207') {
          content = self._parseMultiStatus(content);
        };
        var statusstring = STATUS_CODES[status];
        handler.call(context, status, statusstring,
                      content, headers);
      };
    };
  };
  return (new HandlerWrapper().execute);
};

this.DavClient.prototype._generateUrl = function (path) {
  /* convert a url from a path */
  var url = this.protocol + '://' + this.host;
  if (this.port) {
    url += ':' + this.port;
  };
  url += path;
  return url;
};

this.DavClient.prototype._parseMultiStatus = function (xml) {
  /* parse a multi-status request 
      
      see MultiStatusSaxHandler below
  */
  var handler = new MultiStatusSAXHandler();
  var parser = new SAXParser();
  parser.initialize(xml, handler);
  parser.parse();
  return handler.root;
};

this.DavClient.prototype._parseLockinfo = function (xml) {
  /* parse a multi-status request 
      
      see MultiStatusSaxHandler below
  */
  var handler = new LockinfoSAXHandler();
  var parser = new SAXParser();
  parser.initialize(xml, handler);
  parser.parse();
  return handler.lockInfo;
};

this.DavClient.prototype._getProppatchXml = function (setprops, delprops) {
  /* create the XML for a PROPPATCH request

      setprops is a mapping from namespace to a mapping
      of key/value pairs (where value is an *entitized* XML string), 
      delprops is a mapping from namespace to a list of names
  */
  var xml = '<?xml version="1.0" encoding="UTF-8" ?>\n' +
              '<D:propertyupdate xmlns:D="DAV:">\n';

  var shouldsetprops = false;
  for (var attr in setprops) {
    shouldsetprops = true;
  };
  if (shouldsetprops) {
    xml += '<D:set>\n';
    for (var ns in setprops) {
      for (var key in setprops[ns]) {
        xml += '<D:prop>\n' +
                this._preparePropElement(ns, key,
                                          setprops[ns][key]) +
                '</D:prop>\n';
      };
    };
    xml += '</D:set>\n';
  };

  var shoulddelprops = false;
  for (var attr in delprops) {
    shoulddelprops = true;
  };
  if (shoulddelprops) {
    xml += '<D:remove>\n<D:prop>\n';
    for (var ns in delprops) {
      for (var i = 0; i < delprops[ns].length; i++) {
        xml += '<' + delprops[ns][i] + ' xmlns="' + ns + '"/>\n';
      };
    };
    xml += '</D:prop>n</D:remove>\n';
  };

  xml += '</D:propertyupdate>';

  return xml;
};

this.DavClient.prototype._getLockXml = function (owner, scope, type) {
  var xml = '<?xml version="1.0" encoding="utf-8"?>\n' +
              '<D:lockinfo xmlns:D="DAV:">\n' +
              '<D:lockscope><D:' + scope + ' /></D:lockscope>\n' +
              '<D:locktype><D:' + type + ' /></D:locktype>\n' +
              '<D:owner>\n<D:href>' +
              string.entitize(owner) +
              '</D:href>\n</D:owner>\n' +
              '</D:lockinfo>\n';
  return xml;
};

this.DavClient.prototype._preparePropElement = function (ns, key, value) {
  /* prepare the DOM for a property

      all properties have a DOM value to allow the same structure
      as in WebDAV
  */
  var dom = new dommer.DOM();
  // currently we expect the value to be a well-formed bit of XML that 
  // already contains the ns and key information...
  var doc = dom.parseXML(value);
  // ... so we don't need the following bit
  /*
  doc.documentElement._setProtected('nodeName', key);
  var pl = key.split(':');
  doc.documentElement._setProtected('prefix', pl[0]);
  doc.documentElement._setProtected('localName', pl[1]);
  doc.namespaceURI = ns;
  doc.documentElement._setProtected('namespaceURI', ns);
  */
  return doc.documentElement.toXML();
};

this.DavClient.prototype._parseHeaders = function (headerstring) {
  var lines = headerstring.split('\n');
  var headers = {};
  for (var i = 0; i < lines.length; i++) {
    var line = string.strip(lines[i]);
    if (!line) {
      continue;
    };
    var chunks = line.split(':');
    var key = string.strip(chunks.shift());
    var value = string.strip(chunks.join(':'));
    var lkey = key.toLowerCase();
    if (headers[lkey] !== undefined) {
      if (!headers[lkey].push) {
        headers[lkey] = [headers[lkey, value]];
      } else {
        headers[lkey].push(value);
      };
    } else {
      headers[lkey] = value;
    };
  };
  return headers;
};