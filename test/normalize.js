'use strict';

var assert = require('assert');
var path = require('path');
var File = require('vinyl');
var dest = require('..');
var normalize = dest.normalize;
var file;

describe('normalize', function () {
  beforeEach(function () {
    file = new File({
      path: 'test/fixtures/a.txt'
    });
  });

  it('should prepend the given directory to the file.path', function () {
    normalize('foo', file, function(err, fp) {
      assert(!err);
      assert(fp);
      assert.equal(fp, path.resolve('foo/test/fixtures/a.txt'));
    });
  });

  it('should prepend the `options.cwd` to the dest', function () {
    normalize('foo', file, {cwd: 'bar'}, function(err, fp) {
      assert(!err);
      assert(fp);
      assert.equal(fp, path.resolve('bar/foo/test/fixtures/a.txt'));
    });
  });

  it('should flatten to the basename', function () {
    normalize('foo', file, {flatten: true}, function(err, fp) {
      assert(!err);
      assert(fp);
      assert.equal(fp, path.resolve('bar/foo/test/fixtures/a.txt'));
    });
  });
});
