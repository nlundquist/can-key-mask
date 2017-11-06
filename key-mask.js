/**
 * Created by Nils Lundquist (nils@bitovi.com) on 2017-11-04.
 */

import { getPatternMasker, getPatternInserter } from 'can-key-mask/masks/pattern';

// TODO: work with editing inside of the string
// TODO: fix bug with space
// TODO: test uppercase (key vs char usage)
// TODO: Firefox, Safari & IE testing of existing functionality
// TODO: mask placeholder functionality
// TODO: setup testing for local puppeteer & remote browser stack testing
// TODO: paste event support (non-IE only)
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

// add multiple characters to input
function insertCharacters(chars) {
  if (chars && chars.length) {
    const start = this.element.selectionStart;
    const end = this.element.selectionEnd;
    const val = this.element.value;
    const str = chars.join('');

    this.element.value = `${val.slice(0, start)}${str}${val.slice(end)}`;
  }
}

function setupEvents() {
  this.keypressHandler = (ev) => {
    // if the keystroke would invalidate the pattern, prevent it
    if (this.masker(ev)) {
      ev.preventDefault();

      // if inserting fixed characters from the pattern before the current keystroke validates the pattern,
      // add those characters
      if (this.inserter) {
        this.insertCharacters(this.inserter(ev));
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
  this.inserter = null; // function that insert additional characters if keypress doesn't insert as normal

  const valid = this.validateElement() && this.hasConfiguration();

  if (valid) {
    if (this.config.pattern) {
      this.masker = this.getPatternMasker();
      if (this.config.insertStaticCharacters) {
        this.inserter = this.getPatternInserter();
      }
    }

    this.setupEvents();
  }
}

Object.assign(KeyMask.prototype, {
  getMaskConfiguration,
  validateElement,
  hasConfiguration,
  getPatternMasker,
  getPatternInserter,
  warn,
  setupEvents,
  insertCharacters,
});

export default KeyMask;