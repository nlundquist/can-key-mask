/**
 * Created by Nils Lundquist (nils@bitovi.com) on 2017-11-04.
 */

import escapeRegExp from 'lodash.escaperegexp';
import flatten from 'lodash.flatten';

// TODO: keep existing dynamic characters in current group when reformatting / reformat per-group
// TODO: bug when pattern is invalidated and an edit is made (resets input)
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

function getPatternValidator() {
  const valid = getValidationRegex(parsePattern(this.config.pattern));
  return () => { return valid.test(this.element.value); }
}

// return a function that, if possible, reformats the result of the current keystroke to pass validation
function getPatternFormatter() {
  const patternParts = parsePattern(this.config.pattern);
  const valid = getValidationRegex(patternParts);
  const [decomposer, decomposedGroupTypes] = getDecomposingRegex(patternParts);
  const maxDynamicCharacters = patternParts.filter((p) => p.type === 'class').length;

  // finds characters inserted & removed from last value
  // inserts new characters into set of dynamic characters from previous value, removing any if needed
  // reformats updated set of dynamic characters into a string based on the pattern
  // if reformatted string matches pattern return reformatted string and an index following the new characters
  return (stringChanges) => {
    const oldString = this.element.oldValue;
    const {newCharacters, replacedCharacters, prefixSize} = stringChanges;

    // find how many dynamic characters were removed during this input value change
    let removedDynamicCharCount = patternParts.slice(prefixSize, prefixSize + replacedCharacters.length)
        .reduce((ret, part) => {
      if (part.type === 'class') { ret++ }
      return ret;
    }, 0);

    // get all dynamic characters out of old string
    const capturedGroups = decomposer.exec(oldString).slice(1).map(m => m.split(''));
    const dynamicCharacters = flatten(capturedGroups.filter((group, i) => decomposedGroupTypes[i] === 'class'));

    // since we are splicing into the set of dynamic characters, adjust insertion (selectionStart) position for preceding static characters
    let stringIndex = 0;
    let selectionStart = this.element.selectionStart - newCharacters.length;
    const insertionPosition = capturedGroups.reduce((ret, group, i) => {
      group.forEach(() => {
        if (decomposedGroupTypes[i] === 'static' && stringIndex < selectionStart) { ret--; }
        stringIndex++;
      });
      return ret;
    }, selectionStart);

    dynamicCharacters.splice(insertionPosition, removedDynamicCharCount, ...newCharacters);

    // if we've ended up with more characters than we have spaces for, don't bother reformatting
    if (dynamicCharacters.length > maxDynamicCharacters) { return [null, null]; }

    // create a new string by putting the dynamic chars into appropriate positions
    let index = 0;
    let dynamicCount = 0;
    let interspersedStaticCount = 0; // number of static characters interspersed with the newly inserted characters
    let finalInsertionIndex = null; // position in finished string of the newly inserted characters, used for caret repositioning
    const reformattedStringChars = [];
    while (dynamicCount < dynamicCharacters.length) {
      const part = patternParts[index];
      if (part.type === 'class') {
        if (dynamicCount === insertionPosition) { finalInsertionIndex = index; }
        reformattedStringChars.push(dynamicCharacters[dynamicCount++]);
      }
      else if (part.type === 'static') {
        if (finalInsertionIndex && dynamicCount < insertionPosition + newCharacters.length) {
          interspersedStaticCount++;
        }
        reformattedStringChars.push(part.character);
      }
      index++;
    }

    const newCaretPosition = finalInsertionIndex + interspersedStaticCount + newCharacters.length;
    const reformattedString = reformattedStringChars.join('');
    if (valid.test(reformattedString)) {
      return [reformattedString, newCaretPosition];
    }

    return [null, null];
  }
}

export { getPatternFormatter as default, getPatternFormatter, getPatternValidator }