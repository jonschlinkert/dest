'use strict';

var utils = require('lazy-cache')(require);
var fs = require;

/**
 * Lazily required module dependencies
 */

require = utils;
require('graceful-fs', 'fs');
require('resolve-dir', 'resolve');
require('extend-shallow', 'extend');
require('through2', 'through');
require('mkdirp');
require = fs;

/**
 * Replace file extension
 */

utils.rewriteExt = function(fp, opts) {
  if (opts.ext === false) {
    opts.ext = '';
  }
  if (opts.ext.charAt(0) !== '.') {
    opts.ext = '.' + opts.ext;
  }
  fp = replaceExt(fp, opts);
  if (fp.slice(-1) === '.') {
    fp = fp.slice(0, -1);
  }
  return fp;
};

function replaceExt(fp, opts) {
  var re = {first: /(\.[^\/]*)?$/, last: /(\.[^\/\.]*)?$/};
  if (typeof opts.extDot === 'undefined') {
    opts.extDot = 'first';
  }
  return fp.replace(re[opts.extDot], opts.ext);
}

/**
 * Expose utils
 */

module.exports = utils;
