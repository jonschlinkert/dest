'use strict';

var fs = require('fs');
var path = require('path');
var utils = require('./utils');

function dest(dir, options) {
  if (!dir) {
    throw new TypeError('expected dest to be a string or function.');
  }

  var stream = utils.through.obj(function (file, enc, cb) {
    var opts = normalizeOpts(file, options);

    normalize(dir, file, opts, function (err, fp) {
      if (err) return cb(err);
      writeFile(fp, file, opts, cb);
    });
  });
  stream.resume();
  return stream;
}

function writeFile(fp, file, opts, cb) {
  utils.mkdirp(path.dirname(fp), opts.dirMode, function (err) {
    if (err) return cb(err);
    writeContents(fp, file, cb);
  });
}

function normalizeOpts(file, options) {
  var opts = utils.extend({
    cwd: process.cwd(),
    mode: (file.stat ? file.stat.mode : null),
    dirMode: null,
    overwrite: true
  }, options);

  opts.flag = (opts.overwrite ? 'w' : 'wx');
  return opts;
}

function streamFile(file, opts, cb) {
  file.contents = fs.createReadStream(file.path);
  cb(null, file);
}

function writeContents(fp, file, cb) {
  if (file.isDirectory()) {
    return writeDir(fp, file, written);
  }
  if (file.isStream()) {
    return writeStream(fp, file, written);
  }
  if (file.isBuffer()) {
    return writeBuffer(fp, file, written);
  }
  if (file.symlink) {
    return writeSymbolicLink(fp, file, written);
  }
  if (file.isNull()) {
    return complete();
  }

  function complete(err) {
    cb(err, file);
  }

  function written(err) {
    if (isErrorFatal(err)) {
      return complete(err);
    }

    if (!file.stat || typeof file.stat.mode !== 'number' || file.symlink) {
      return complete();
    }

    fs.stat(fp, function(err, st) {
      if (err) {
        return complete(err);
      }
      var currentMode = (st.mode & parseInt('0777', 8));
      var expectedMode = (file.stat.mode & parseInt('0777', 8));
      if (currentMode === expectedMode) {
        return complete();
      }
      fs.chmod(fp, expectedMode, complete);
    });
  }

  function isErrorFatal(err) {
    if (!err) {
      return false;
    }

    // Handle scenario for file overwrite failures.
    else if (err.code === 'EEXIST' && file.flag === 'wx') {
      return false;
    }

    // Otherwise, this is a fatal error
    return true;
  }
}

function writeBuffer(destDir, file, cb) {
  var opt = { mode: file.stat.mode, flag: file.flag };
  utils.fs.writeFile(destDir, file.contents, opt, cb);
}

function writeDir(destDir, file, cb) {
  utils.mkdirp(destDir, file.stat.mode, cb);
}

function writeStream(dir, file, cb) {
  var opts = {mode: file.stat.mode, flag: file.flag};

  var stream = utils.fs.createWriteStream(dir, opts);

  file.contents.once('error', complete);
  stream.once('error', complete);
  stream.once('finish', success);

  file.contents.pipe(stream);

  function success() {
    streamFile(file, {}, complete);
  }

  // cleanup
  function complete(err) {
    file.contents.removeListener('error', cb);
    stream.removeListener('error', cb);
    stream.removeListener('finish', success);
    cb(err);
  }
}

function writeSymbolicLink(destDir, file, cb) {
  utils.fs.symlink(file.symlink, destDir, function (err) {
    if (err && err.code !== 'EEXIST') {
      return cb(err);
    }
    cb(null, file);
  });
}

function normalize(dir, file, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  opts = opts || {};
  if (file.options) {
    opts = utils.extend({}, opts, file.options);
  }

  var cwd = utils.resolve(opts.cwd || '');
  var filepath;
  var destDir;

  if (opts.destbase) {
    cwd = path.resolve(utils.resolve(opts.destbase), cwd);
  }

  cwd = path.resolve(cwd);

  if (opts.expand === true) {
    if (typeof dir !== 'string') {
      return cb(new TypeError('expected dest to be a string with expand=true'));
    }

    filepath = path.resolve(dir);
    destDir = path.dirname(filepath);

  } else {
    if (typeof dir === 'function') {
      destDir = dir(file);

    } else if (typeof dir === 'string') {
      destDir = dir;

    } else {
      return cb(new TypeError('expected dest to be a string or function.'));
    }
  }

  var base = opts.base;
  var basePath;

  if (!base) {
    basePath = path.resolve(cwd, destDir);

  } else if (typeof base === 'function') {
    basePath = base(file);

  } else if (typeof base === 'string') {
    basePath = base;

  } else {
    throw new TypeError('expected base to be a string, function or undefined.');
  }

  if (opts.flatten === true) {
    file.path = path.basename(file.path);
  }

  if (typeof filepath === 'undefined') {
    filepath = path.resolve(basePath, file.relative);
  }

  if (typeof opts.ext !== 'undefined') {
    filepath = utils.rewriteExt(filepath, opts);
  }

  // update stat properties
  file.stat = (file.stat || new fs.Stats());
  file.stat.mode = opts.mode;
  file.flag = opts.flag;

  // update path properties
  file.cwd = cwd;
  file.base = basePath;
  file.path = filepath;

  if (typeof file.dest === 'function') {
    return file.dest(filepath, opts, cb);
  }

  cb(null, filepath);
}

/**
 * Expose `dest`
 */

module.exports = dest;

/**
 * Expose `dest`
 */

module.exports.normalize = normalize;
