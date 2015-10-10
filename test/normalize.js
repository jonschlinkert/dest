'use strict';

var assert = require('assert');
var path = require('path');
var File = require('vinyl');
var dest = require('..');
var normalize = dest.normalize;
var file;

describe('normalize', function () {
  beforeEach(function () {
    file = new File({path: 'test/fixtures/a.txt'});
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

  it('should prepend `options.base`', function () {
    normalize('foo', file, {base: 'bar'}, function(err, fp) {
      assert(!err);
      assert(fp);
      assert.equal(fp, path.resolve('bar/test/fixtures/a.txt'));
    });
  });

  it('should extend options with `file.options', function () {
    file = new File({path: 'test/fixtures/a.txt'});
    file.options = {cwd: 'site'};
    normalize('foo', file, function(err, fp) {
      assert(!err);
      assert(fp);
      assert.equal(fp, path.resolve('site/foo/test/fixtures/a.txt'));
    });
  });

  it('should flatten to the basename', function () {
    normalize('foo.txt', file, {expand: true}, function(err, fp) {
      assert(!err);
      assert(fp);
      assert.equal(fp, path.resolve('foo.txt'));
    });
  });

  it('should flatten to the basename', function () {
    var fn = function () {};
    normalize(fn, file, {expand: true}, function(err, fp) {
      assert(err);
      assert(err.message);
      assert.equal(err.message, 'expected dest to be a string with expand=true');
    });
  });

  it('should flatten to the basename', function () {
    normalize('foo', file, {flatten: true}, function(err, fp) {
      assert(!err);
      assert(fp);
      assert.equal(fp, path.resolve('foo/a.txt'));
    });
  });

  it('should prepend `options.destbase` to dir', function () {
    normalize('foo', file, {destbase: 'site'}, function(err, fp) {
      assert(!err);
      assert(fp);
      assert.equal(fp, path.resolve('site/foo/test/fixtures/a.txt'));
    });
  });

  it('should prepend `options.destbase` to cwd then dir', function () {
    var opts = {destbase: 'site', cwd: 'foo'};
    normalize('bar', file, opts, function(err, fp) {
      assert(!err);
      assert(fp);
      assert.equal(fp, path.resolve('site/foo/bar/test/fixtures/a.txt'));
    });
  });

  it('should flatten with `options.destbase`', function () {
    var opts = {destbase: 'site', cwd: 'foo', flatten: true};
    normalize('bar', file, opts, function(err, fp) {
      assert(!err);
      assert(fp);
      assert.equal(fp, path.resolve('site/foo/bar/a.txt'));
    });
  });

  it('should replace the file extension', function () {
    var opts = {ext: '.html'};
    normalize('site', file, opts, function(err, fp) {
      assert(!err);
      assert(fp);
      assert.equal(fp, path.resolve('site/test/fixtures/a.html'));
    });
  });

  it('should strip the file extension', function () {
    var opts = {ext: false};
    normalize('site', file, opts, function(err, fp) {
      assert(!err);
      assert(fp);
      assert.equal(fp, path.resolve('site/test/fixtures/a'));
    });
  });
});

describe('options.extDot', function () {
  beforeEach(function () {
    file = new File({path: 'a/b/c.min.coffee'});
  });

  it('should use the part after the last dot:', function () {
    var opts = {ext: 'js', extDot: 'last'};
    normalize('site', file, opts, function(err, fp) {
      assert(!err);
      assert(fp);
      assert.equal(fp, path.resolve('site/a/b/c.min.js'));
    });
  });

  it('should use the part after the first dot:', function () {
    var opts = {ext: 'js', extDot: 'first'};
    normalize('site', file, opts, function(err, fp) {
      assert(!err);
      assert(fp);
      assert.equal(fp, path.resolve('site/a/b/c.js'));
    });
  });
});
