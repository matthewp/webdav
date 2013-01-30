var DEBUG = false;

module.exports = function (text) {
  /* simple debug function

      set the DEBUG global to some true value, and messages will appear
      on the bottom of the document
  */
  if (!DEBUG) {
    return;
  };
  var div = document.createElement('div');
  var text = document.createTextNode(text);
  div.appendChild(text);
  document.getElementsByTagName('body')[0].appendChild(div);
};