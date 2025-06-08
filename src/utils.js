const unidecode = require('unidecode');

function normalize(text) {
  return unidecode.unidecode(text);
}

module.exports = { normalize };