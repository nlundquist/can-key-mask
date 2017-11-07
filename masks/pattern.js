/**
 * Created by Nils Lundquist (nils@bitovi.com) on 2017-11-04.
 */

import zip from 'lodash.zip';

// TODO: multiple pattern support
// TODO: allow custom character classes

const characterClasses = {
  '9': new RegExp('[\\d]'), // any digit
  'A': new RegExp('[A-Za-z]'), // any alpha character
};

function validatePatternConfig() {

}

// parse pattern into array of per-character regular expressions with additional info
function parsePattern(pattern) {
  let parts = [];

  for (let char of pattern) {
    const charClass = characterClasses[char];
    let escape = '';

    if (charClass) {
      parts.push({ regex: charClass, type: 'class' });
    } else {
      // non-class character
      if (/\W/.test(char)) { escape = '\\'; } // escape all non-alphanumeric characters
      parts.push({ regex: new RegExp(`[${escape}${char}]`), type: 'static', character: char});
    }
  }

  return parts
}

// get the regular expression used to check if the input string is valid
function getValidationRegex(patternParts) {
  const regexParts = patternParts.map(p => `(?:${p.regex.toString().slice(1, -1)}|$)`);
  return new RegExp(`^${regexParts.join('')}$`);
}

function getPossibleString(element, inserted) {
  const val = element.value;
  const start = element.selectionStart;
  const end = element.selectionEnd;
  return `${val.slice(0, start)}${inserted}${val.slice(end)}`;
}

// TODO: only validate the current keystroke? instead of full string thus far
// return a function that checks if the current keystroke should be cancelled
function getPatternMasker() {
  validatePatternConfig();
  const valid = getValidationRegex(parsePattern(this.config.pattern));

  return (ev) => {
    return !valid.test(getPossibleString(this.element, ev.key));
  }
}

// return a function that, if possible, reformats the result of the current keystroke to pass validation
function getPatternReplacer() {
  const patternParts = parsePattern(this.config.pattern);
  const valid = getValidationRegex(patternParts);

  return (ev) => {
    const currentString = this.element.value;
    const currentParts = zip(currentString.split(''), patternParts.slice(0, currentString.length));

    // get all the characters that are in a class position and add the new character
    let insertionPosition = this.element.selectionStart;
    const nonFixedChars = currentParts.filter(([current, part], i) => {
      if (part.type === 'class') { return true; }
      if (i < this.element.selectionStart) { insertionPosition--; }
      return false;
    }).map(([current, part]) => current);

    nonFixedChars.splice(insertionPosition, 0, ev.key);

    // create a new string by putting the non-fixed chars into non-fixed character positions
    let index = 0;
    let nonFixedCount = 0;
    const reformattedStringChars = [];
    while (nonFixedCount < nonFixedChars.length) {
      const part = patternParts[index];
      if (part.type === 'class') { reformattedStringChars.push(nonFixedChars[nonFixedCount++]); }
      else if (part.type === 'static') { reformattedStringChars.push(part.character); }
      index++;
    }

    const reformattedString = reformattedStringChars.join('');
    if (valid.test(reformattedString)) {
      return reformattedString;
    }

    return null;
  }
}

export { getPatternMasker as default, getPatternMasker, getPatternReplacer }