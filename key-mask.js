/**
 * Created by Nils Lundquist (nils@bitovi.com) on 2017-11-04.
 */

import assign from 'lodash.assign';
import { getPatternMasker, getPatternReplacer } from 'can-key-mask/masks/pattern';

// TODO: paste event / autofill support (non-IE only)
// TODO: mask placeholder functionality
// TODO: setup testing for local puppeteer & remote browser stack testing
// TODO: handle unbinding
// TODO: multiple masks per input?
// TODO: include pre-configured "keyword" masks?
// TODO: support for other keyboards / non-ascii

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

// TODO: synthesize change event in IE11? check if required
// add multiple characters to input
function replaceValue([newValue, insertionPosition]) {
  if (newValue) {
    this.element.value = newValue;
    this.element.setSelectionRange(insertionPosition+1, insertionPosition+1);
  }
}

function setupEvents() {
  this.keypressHandler = (ev) => {
    // if the keystroke would invalidate the pattern, prevent it
    if (this.masker(ev)) {
      ev.preventDefault();

      // if reformatting input with the fixed characters from the pattern validates the string, replace the current value
      if (this.replacer) {
        this.replaceValue(this.replacer(ev));
      }
    }
  };

  this.element.addEventListener('keypress', this.keypressHandler);

  //TODO: add paste event
}

function KeyMask(element) {
  this.element = element;
  this.config = this.getMaskConfiguration();
  this.masker = null; // function that decide if character is permitted to be inserted
  this.replacer = null; // function that reformats the input if keypress doesn't insert as normal

  const valid = this.validateElement() && this.hasConfiguration();

  if (valid) {
    if (this.config.pattern) {
      this.masker = this.getPatternMasker();
      if (this.config.insertStaticCharacters) {
        this.replacer = this.getPatternReplacer();
      }
    }

    this.setupEvents();
  }
}

assign(KeyMask.prototype, {
  getMaskConfiguration,
  validateElement,
  hasConfiguration,
  getPatternMasker,
  getPatternReplacer,
  warn,
  setupEvents,
  replaceValue,
});

export default KeyMask;