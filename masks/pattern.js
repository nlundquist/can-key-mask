/**
 * Created by Nils Lundquist (nils@bitovi.com) on 2017-11-04.
 */

import escapeRegExp from 'lodash.escaperegexp';
import flatten from 'lodash.flatten';

// TODO: keep existing dynamic characters in current group when reformatting / reformat per-group
// TODO: multiple pattern support?
// TODO: allow new & replacement of character classes

const characterClasses = {
  '9': new RegExp('[\\d]'), // any digit
  'A': new RegExp('[A-Za-z]'), // any alpha character
  'U': new RegExp('[A-Z]'), // any uppercase alpha character
};

function validatePatternConfig() {

}

// parse pattern into array of per-character regular expressions with additional info
function parsePattern(pattern) {
  let parts = [];

  for (let char of pattern) {
    const charClass = characterClasses[char];

    if (charClass) {
      parts.push({ regex: charClass, type: 'class' });
    } else {
      // non-class character
      parts.push({ regex: new RegExp(`${escapeRegExp(char)}`), type: 'static', character: char});
    }
  }

  return parts
}

// get a regular expression used to check if the input string is valid
function getValidationRegex(patternParts) {
  const regexParts = patternParts.map(p => `(?:${p.regex.toString().slice(1, -1)}|$)`);
  return new RegExp(`^${regexParts.join('')}$`);
}

// get a regular expression that decomposes an existing value into groups of dynamic characters and static characters
function getDecomposingRegex(patternParts) {
  // regex parts list split by part type
  const groupedParts = patternParts.reduce((ret, part) => {
    const lastGroup = ret[ret.length - 1];
    const lastPart = lastGroup && lastGroup[0];
    if (lastPart && lastPart.type === part.type) {
      lastGroup.push(part);
    } else {
      ret.push([part]);
    }
    return ret;
  }, []);

  const [regexString, groupTypes] = groupedParts.reduce(([regexStr, groupTypes], group) => {
    const groupType = group[0].type;
    groupTypes.push(groupType);

    if (groupType === 'class') {
      regexStr += '(.*?)';
    } else {
      regexStr  += '(';
      group.forEach((part) => {
        regexStr += `(?:${escapeRegExp(part.character)}|$)`;
      });
      regexStr += ')';
    }

    return [regexStr, groupTypes];
  }, ["", []]);

  return [new RegExp(`${regexString}$`), groupTypes];
}

function getPossibleString(element, inserted) {
  const val = element.value;
  const start = element.selectionStart;
  const end = element.selectionEnd;
  return `${val.slice(0, start)}${inserted}${val.slice(end)}`;
}

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
  const [decomposer, decomposedGroupTypes] = getDecomposingRegex(patternParts);

  return (ev) => {
    const currentString = this.element.value;

    // get all dynamic characters out of string
    const capturedGroups = decomposer.exec(currentString).slice(1).map(m => m.split(''));
    const dynamicCharacters = flatten(capturedGroups.filter((group, i) => decomposedGroupTypes[i] === 'class'));

    // since we are splicing into the set of dynamic characters, adjust insertion (selectionStart) position for preceding static characters
    let stringIndex = 0;
    let selectionStart = this.element.selectionStart;
    const insertionPosition = capturedGroups.reduce((ret, group, i) => {
      group.forEach(() => {
        if (decomposedGroupTypes[i] === 'static' && stringIndex < selectionStart) { ret--; }
        stringIndex++;
      });
      return ret;
    }, selectionStart);

    dynamicCharacters.splice(insertionPosition, 0, ev.key);

    // create a new string by putting the non-fixed chars into non-fixed character positions
    let index = 0;
    let nonFixedCount = 0;
    let newCharPositon = null; // final position of the newly inserted character, used for caret positioning post value replacement
    const reformattedStringChars = [];
    while (nonFixedCount < dynamicCharacters.length) {
      const part = patternParts[index];
      if (part.type === 'class') {
        if (nonFixedCount === insertionPosition) { newCharPositon = index; }
        reformattedStringChars.push(dynamicCharacters[nonFixedCount++]);
      }
      else if (part.type === 'static') { reformattedStringChars.push(part.character); }
      index++;
    }

    const reformattedString = reformattedStringChars.join('');
    if (valid.test(reformattedString)) {
      return [reformattedString, newCharPositon];
    }

    return [null, null];
  }
}

export { getPatternMasker as default, getPatternMasker, getPatternReplacer }