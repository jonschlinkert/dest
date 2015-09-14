'use strict';

var fs = require('fs');
var gfs = require('graceful-fs');
var path = require('path');
var extend = require('extend-shallow');
var through = require('through2');
var mkdirp = require('mkdirp');

module.exports = dest;

function dest(dir, options) {
  var stream = through.obj(function (file, enc, cb) {
    var opts = normalizeOpts(file, options);
    if (typeof file.dest === 'function') {
      return file.dest(dir, opts, function (err, fp) {
        if (err) return cb(err);
        writeFile(fp, file, opts, cb);
      });
    }

    dest.normalize(dir, file, opts, function (err, fp) {
      if (err) return cb(err);
      writeFile(fp, file, opts, cb);
    });
  });
  stream.resume();
  return stream;
};

function writeFile(fp, file, opts, cb) {
  // mkdirp the folder the file is going in
  mkdirp(path.dirname(fp), opts.dirMode, function (err) {
    if (err) return cb(err);
    writeContents(fp, file, cb);
  });
}

function normalizeOpts(file, options) {
  var opts = extend({
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

function writeContents(writePath, file, cb) {
  if (file.isDirectory()) {
    return writeDir(writePath, file, written);
  }
  if (file.isStream()) {
    return writeStream(writePath, file, written);
  }
  if (file.isBuffer()) {
    return writeBuffer(writePath, file, written);
  }
  if (file.symlink) {
    return writeSymbolicLink(writePath, file, written);
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

    fs.stat(writePath, function(err, st) {
      if (err) {
        return complete(err);
      }
      var currentMode = (st.mode & parseInt('0777', 8));
      var expectedMode = (file.stat.mode & parseInt('0777', 8));
      if (currentMode === expectedMode) {
        return complete();
      }
      fs.chmod(writePath, expectedMode, complete);
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
  gfs.writeFile(destDir, file.contents, opt, cb);
}

function writeDir(destDir, file, cb) {
  mkdirp(destDir, file.stat.mode, cb);
}

function writeStream(destDir, file, cb) {
  var opts = {mode: file.stat.mode, flag: file.flag};

  var outStream = gfs.createWriteStream(destDir, opts);

  file.contents.once('error', complete);
  outStream.once('error', complete);
  outStream.once('finish', success);

  file.contents.pipe(outStream);

  function success() {
    streamFile(file, {}, complete);
  }

  // cleanup
  function complete(err) {
    file.contents.removeListener('error', cb);
    outStream.removeListener('error', cb);
    outStream.removeListener('finish', success);
    cb(err);
  }
}

function writeSymbolicLink(destDir, file, cb) {
  gfs.symlink(file.symlink, destDir, function (err) {
    if (err && err.code !== 'EEXIST') {
      return cb(err);
    }
    cb(null, file);
  });
}

dest.normalize = function normalize(dest, file, opts, cb) {
  opts = opts || {};
  var cwd = path.resolve(opts.cwd);

  if (typeof dest !== 'string' && typeof dest !== 'function') {
    throw new Error('Invalid output folder');
  }

  var destPath = (typeof dest === 'string' ? dest : dest(file));

  var base = opts.base;
  if (base && typeof base !== 'string' && typeof base !== 'function') {
    throw new Error('Invalid base option');
  }

  var basePath = base
    ? (typeof base === 'string' ? base : base(file))
    : path.resolve(cwd, destPath);

  if (typeof basePath !== 'string') {
    throw new Error('Invalid base option');
  }

  var filepath = path.resolve(basePath, path.basename(file.relative));
  var dir = path.dirname(filepath);

  // wire up new properties
  file.stat = (file.stat || new gfs.Stats());
  file.stat.mode = opts.mode;
  file.flag = opts.flag;
  file.cwd = cwd;
  file.base = basePath;
  file.path = filepath;

  cb(null, filepath);
};
