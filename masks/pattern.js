/**
 * Created by Nils Lundquist (nils@bitovi.com) on 2017-11-04.
 */

import takeWhile from 'lodash.takewhile';

// TODO: multiple pattern support
// TODO: allow custom character classes

const characterClasses = {
  '9': '(?:[\\d]{1}|$)', // any digit
  'A': '(?:[A-Za-z]{1}|$)', // any alpha character
};

function validatePatternConfig() {

}

// regular expression that determines if a keypress should be cancelled
function parsePattern(pattern) {
  let parts = [{ regex: '^', type: 'start' }];

  for (let char of pattern) {
    const charClass = characterClasses[char];
    let escape = '';

    if (charClass) {
      parts.push({ regex: charClass, type: 'class' });
    } else {
      // non-class character
      if (/\W/.test(char)) { escape = '\\'; } // escape all non-alphanumeric characters
      parts.push({ regex: `(?:[${escape}${char}]{1}|$)`, type: 'static', character: char});
    }
  }

  parts.push({ regex: '$', type: 'end' });

  return parts
}

function getPossibleString(element, inserted) {
  const val = element.value;
  const index = element.selectionStart;
  return `${val.slice(0, index)}${inserted}${val.slice(index)}`;
}

// TODO: only validate the current keystroke? instead of full string thus far
function getPatternMasker() {
  validatePatternConfig();
  const patternParts = parsePattern(this.config.pattern).map(p => p.regex);
  const cancelRegex = new RegExp(patternParts.join(''));

  return (ev) => {
    return !cancelRegex.test(getPossibleString(this.element, ev.key));
  }
}

function getPatternInserter() {
  const patternParts = parsePattern(this.config.pattern);
  const cancelRegex = new RegExp(patternParts.map(p => p.regex).join(''));

  return (ev) => {
    const index = this.element.selectionStart;
    const nextStaticChars = takeWhile(patternParts.slice(index+1), p => p.type === 'static').map(p => p.character);
    const possibleString = getPossibleString(this.element, `${nextStaticChars.join('')}${ev.key}`);

    if (cancelRegex.test(possibleString)) {
      return nextStaticChars.concat(ev.key);
    }

    return [];
  }
}

export { getPatternMasker as default, getPatternMasker, getPatternInserter }