'use strict';

var fs = require('fs');
var path = require('path');
var extend = require('extend-shallow');
var mkdirp = require('mkdirp');
var stripBom = require('strip-bom');
var through2 = require('through2');

module.exports = function dest(dir, options) {
  var stream = through2.obj(function (file, enc, cb) {
    normalize(dir, file, options, function (err, fp) {
      if (err) return cb(err);
      writeContents(fp, file, cb);
    });
  });
  stream.resume();
  return stream;
};

function streamFile(file, cb) {
  file.contents = fs.createReadStream(file.path).pipe(stripBom.stream());
  cb(null, file);
}

function writeContents(destDir, file, cb) {
  if (file.isDirectory()) {
    return writeDir(destDir, file, written);
  }
  if (file.isStream()) {
    return writeStream(destDir, file, written);
  }
  if (file.isBuffer()) {
    return writeBuffer(destDir, file, written);
  }
  if (file.isNull()) {
    return done();
  }
  function done(err) {
    cb(err, file);
  }
  function written(err) {
    if (isErrorFatal(err)) return done(err);
    if (!file.stat || typeof file.stat.mode !== 'number') {
      return done();
    }
    fs.stat(destDir, function (err, st) {
      if (err) return done(err);
      // octal 7777 = decimal 4095
      var currentMode = (st.mode & 4095);
      if (currentMode === file.stat.mode) {
        return done();
      }
      fs.chmod(destDir, file.stat.mode, done);
    });
  }

  function isErrorFatal(err) {
    if (!err) return false;
    if (err.code === 'EEXIST' && file.flag === 'wx') {
      return false;
    }
    return true;
  }
}

function writeBuffer(destDir, file, cb) {
  var opt = { mode: file.stat.mode, flag: file.flag };
  fs.writeFile(destDir, file.contents, opt, cb);
}

function writeDir(destDir, file, cb) {
  mkdirp(destDir, file.stat.mode, cb);
}

function writeStream(destDir, file, cb) {
  var opt = { mode: file.stat.mode, flag: file.flag };

  var outStream = fs.createWriteStream(destDir, opt);
  file.contents.once('error', complete);
  outStream.once('error', complete);
  outStream.once('finish', success);

  file.contents.pipe(outStream);

  function success() {
    streamFile(file, complete);
  }

  function complete(err) {
    file.contents.removeListener('error', cb);
    outStream.removeListener('error', cb);
    outStream.removeListener('finish', success);
    cb(err);
  }
}

function normalize(dest, file, options, cb) {
  var opts = extend({
    cwd: process.cwd(),
    mode: (file.stat ? file.stat.mode : null),
    dirMode: null,
    overwrite: true
  }, options);

  opts.flag = (opts.overwrite ? 'w' : 'wx');
  var cwd = path.resolve(opts.cwd);

  if (typeof dest !== 'string' && typeof dest !== 'function') {
    throw new Error('Invalid output folder');
  }

  var destPath = (typeof dest === 'string' ? dest : dest(file));
  var basePath = path.resolve(cwd, destPath);
  var destDir = path.resolve(basePath, file.relative);
  var dir = path.dirname(destDir);

  // wire up new properties
  file.stat = (file.stat || new fs.Stats());
  file.stat.mode = opts.mode;
  file.flag = opts.flag;
  file.cwd = cwd;
  file.base = basePath;
  file.path = destDir;

  // mkdirp the folder the file is going in
  mkdirp(dir, opts.dirMode, function (err) {
    if (err) return cb(err);
    cb(null, destDir);
  });
}
