const unidecode = require('unidecode');

function normalize(text) {
  return unidecode(text);
}

module.exports = { normalize };