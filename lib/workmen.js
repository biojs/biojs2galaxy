/*
 * biojs-galaxy
 * https://github.com/biojs/biojs-galaxy
 *
 * Copyright (c) 2014 BioJS
 * Licensed under the GPLv3
 */

var registry = require("npm-registry");
var npm = new registry();
var q = require('bluebird');
var Minilog = require('minilog');
var log = Minilog("workmen");

var workmen = function(opts, cb) {
  this.keywords = opts.keywords || [];
  this.cb = cb;
  this.hasDownloadedAllKeys = false;
  this.pkgs = [];
  self = this;
};

// downloads all packages found for the defined keywords
workmen.prototype.load = function(keywords) {
  this.pkgs = [];
  var self = this;
  if (keywords.length === 0) {
    return;
  }

  function downloadKeys(keyword) {
    return new q.Promise(function(resolve, reject) {
      npm.packages.keyword(keyword, function(err, packages) {
        if (err == undefined) {
          self._addPackages(packages);
        } else {
          console.log("err", err);
        }
        resolve(packages);
      });
    });
  }

  var ps = [];
  for (var index in keywords) {
    ps.push(downloadKeys(keywords[index]));
  }

  // wait until all keywords are downloaded
  q.all(ps).then(function() {
    self.hasDownloadedAllKeys = true;
    log.info("# pkgs", self.pkgs.length);
    self.trigger("all-pkg-start", self.pkgs);
  });
};

workmen.prototype.addPackages = function(pkgs) {
  pkgs = pkgs.map(function(pkg) {
    return {
      name: pkg,
      version: 'latest'
    };
  });
  this._addPackages(pkgs);
};

workmen.prototype._addPackages = function(pkgs) {
  pkgs.forEach(this.addPackage, this);
};

workmen.prototype.addPackage = function(pkg) {
  // filter duplicates
  if (this.pkgs.indexOf(pkg) < 0) {
    this.trigger("single-pkg-start", pkg, this);
    this.pkgs.push(pkg);
  }
};

// wait until every watcher has finished
workmen.prototype.listener = function() {
  var evtCounts = {};
  var handledPackages = 0;
  self.on("done-pkg", function(pkg) {
    evtCounts[pkg.name] = (evtCounts[pkg.name] + 1) || 1;
    var lastListener = (self.registeredListeners === evtCounts[pkg.name]);
    if (lastListener) {
      handledPackages++;
      // wait until all watchers for all keywords are done
      if (self.pkgs.length == handledPackages && self.hasDownloadedAllKeys) {
        self.cb(self.pkgs);
      }
    }
  });
};

// starts the registry download task
workmen.prototype.start = function(pkgs) {
  // TODO: assuming the existence of the hidden array might lead to unpredictable behavior
  this.registeredListeners = this._events["single-pkg-start"].length;
  this.listener();
  if (typeof pkg !== 'undefined') {
    this.addPackages(pkgs);
    self.hasDownloadedAllKeys = true;
  } else {
    console.log(this.keywords);
    this.load(this.keywords);
  }
};

require("biojs-events").mixin(workmen.prototype);
module.exports = workmen;
