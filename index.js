/**
 * Created by Nils Lundquist (nils@bitovi.com) on 2017-11-04.
 */

import KeyMask from './key-mask';
import callbacks from 'can-view-callbacks';

// TODO: write readme
// TODO: add pre-version NPM script

callbacks.attr('key-mask', function(el) {
  const keymask = new KeyMask(el);
  const removeHandler = () => {
    keymask.destroy();
    el.removeEventListener('removed', removeHandler);
  };

  el.addEventListener('removed', removeHandler);
});