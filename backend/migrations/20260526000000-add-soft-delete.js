'use strict';

var fs = require('fs');
var path = require('path');

exports.setup = function(options) {
  // no-op
};

exports.up = function(db) {
  var filePath = path.join(__dirname, 'sqls', '20260526000000-add-soft-delete-up.sql');
  return new Promise(function(resolve, reject) {
    fs.readFile(filePath, { encoding: 'utf-8' }, function(err, data) {
      if (err) return reject(err);
      resolve(data);
    });
  }).then(function(data) {
    return db.runSql(data);
  });
};

exports.down = function(db) {
  var filePath = path.join(__dirname, 'sqls', '20260526000000-add-soft-delete-down.sql');
  return new Promise(function(resolve, reject) {
    fs.readFile(filePath, { encoding: 'utf-8' }, function(err, data) {
      if (err) return reject(err);
      resolve(data);
    });
  }).then(function(data) {
    return db.runSql(data);
  });
};

exports._meta = {
  version: 1
};
