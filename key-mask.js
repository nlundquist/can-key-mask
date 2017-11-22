/**
 * Created by Nils Lundquist (nils@bitovi.com) on 2017-11-04.
 */

import assign from 'lodash.assign';
import dropWhile from 'lodash.dropwhile';
import dropRightWhile from 'lodash.droprightwhile';
import { getPatternFormatter, getPatternValidator } from "./masks/pattern";

// TODO: add API to get unmasked value
// TODO: mask placeholder functionality
// TODO: setup testing for local puppeteer & remote browser stack testing
// TODO: multiple masks per input?
// TODO: include pre-configured "keyword" masks?
// TODO: support for other keyboards / non-ascii?

const isIE = (navigator.userAgent.indexOf('MSIE') !== -1 || navigator.appVersion.indexOf('Trident/') > 0);

// print nice plugin specific warning messages
function warn(message) {
  console.log(
    `can-key-mask: 
    element:`, this.element, ` 
    warning: ${message}`
  );
}

// get mask configuration
function getMaskConfiguration() {
  const keyMask = this.element.getAttribute('key-mask');
  const patternMask = this.element.getAttribute('key-mask-pattern');

  return {
    pattern: keyMask || patternMask,
    // TODO: add config attribute for insert static characters
    insertStaticCharacters: true,
  }
}

// validate that element is input of type we can key mask
function validateElement() {
  const isInput = this.element instanceof HTMLInputElement;

  if (!validateElement) {
    this.warn('masked element was not defined or is not an element we can apply a mask to');
  }

  return isInput;
}

// validate that some configuration exists
function hasConfiguration() {
  const configurationValid = this.config.pattern;

  if (!configurationValid) {
    this.warn('masked element had no configuration attributes');
  }

  return configurationValid
}

// TODO: could have better naming or remove expectation of 1 character increase?
// add multiple characters to input
function syncValue([newValue, newCaretPosition]) {
  if (newValue || newValue === '') {
    this.element.value = newValue;
    // happens async as a fix for Android. no obvious issues with doing this, so no browser detection done
    setTimeout(() => this.element.setSelectionRange(newCaretPosition, newCaretPosition), 0);

    // set flag so synthesized change event for IE is thrown during blur
    // setting element.value prevents IE from throwing a change event as it should
    if (isIE) { this.sendFakeChange = true; }
    return true;
  } else {
    return false;
  }
}

function setupEvents() {
  this.element.oldValue = this.element.value;

  // check if value following input is valid, if not, reformat, if still not valid, revert state
  // keeps last valid value in element.oldValue
  // sets value & caret position via syncValue
  this.inputHandler = () => {
    let validValue = this.validator();

    // if the new value in the element doesn't validate, attempt to reformat it
    if (validValue) {
      this.element.oldValue = this.element.value;
      return;
    }

    const stringChanges = this.getStringChanges();
    validValue = this.syncValue(this.formatter(stringChanges));

    // if input was valid, or was reformatted to be valid, keep it, else revert to last value
    if (validValue) {
      this.element.oldValue = this.element.value;
      return;
    }

    // if value is invalid, return input to last value & persist caret position
    const revertedCaretPosition = this.element.selectionStart - stringChanges.newCharacters.length;
    this.syncValue([this.element.oldValue, revertedCaretPosition]);
  };

  this.blurHandler = () => {
    if (this.sendFakeChange) {
      delete this.sendFakeChange;
      const event = document.createEvent('Event');
      event.initEvent('change', true, false);
      this.element.dispatchEvent(event);
    }
  };

  this.element.addEventListener('input', this.inputHandler);
  if (isIE) { this.element.addEventListener('blur', this.blurHandler); }
}

function tearDownEvents() {
  delete this.element.oldValue;
  this.element.removeEventListener('input', this.inputHandler);
  this.element.removeEventListener('blur', this.blurHandler);
}

function destroy() {
  this.tearDownEvents();
  delete this.element;
}

// returns an object with details about characters added to the string, characters replaced, and position that occurred at
function getStringChanges() {
  const oldString = this.element.oldValue;
  const currentString = this.element.value;

  // trim matching any matching prefix and suffix from current string
  let prefixSize = 0;
  let suffixSize = 0;
  let newCharacters = dropWhile(currentString, (char, i) => {
    if (char === oldString[i]) {
      prefixSize++;
      return true;
    }
    return false;
  });

  // need to remove prefix characters before checking for suffix
  let trimmedOldString = oldString.slice(prefixSize);
  newCharacters = dropRightWhile(newCharacters, (char, i) => {
    if (char === trimmedOldString[trimmedOldString.length - (newCharacters.length - i)]) {
      suffixSize++;
      return true;
    }
    return false;
  });

  // need to remove suffix to see if we're replacing characters
  trimmedOldString = trimmedOldString.slice(0, trimmedOldString.length - suffixSize);

  return {
    newCharacters,
    replacedCharacters: trimmedOldString,
    prefixSize,
    suffixSize,
  }
}

function KeyMask(element) {
  this.element = element;
  this.config = this.getMaskConfiguration();
  this.formatter = null; // function that reformats the input if keypress doesn't insert as normal

  const configValid = this.validateElement() && this.hasConfiguration();

  if (configValid) {
    if (this.config.pattern) {
      this.validator = this.getPatternValidator();
      this.formatter = this.getPatternFormatter();
    }

    this.setupEvents();
  }
}

assign(KeyMask.prototype, {
  getMaskConfiguration,
  validateElement,
  hasConfiguration,
  getPatternFormatter,
  getPatternValidator,
  getStringChanges,
  warn,
  setupEvents,
  tearDownEvents,
  destroy,
  syncValue,
});

export default KeyMask;