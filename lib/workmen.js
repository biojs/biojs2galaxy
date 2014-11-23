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

var workmen = function(keywords, cb){
  this.keywords = keywords;
  this.cb = cb;
  this.hasDownloadedAllKeys = false;
  this.pkgs = [];
  self = this;
}

// downloads all packages found for the defined keywords
workmen.prototype.load = function(keywords){
  this.pkgs = [];
  var self = this;

  function downloadKeys(keyword){
    return new q.Promise(function(resolve,reject){
      npm.packages.keyword(keyword, function(err, packages){
        if(err == undefined){
          for(var i in packages){
          	// filter duplicates
          	if(self.pkgs.indexOf(packages[i]) < 0){
          		self.trigger("single-pkg-start", packages[i], self);
          		self.pkgs.push(packages[i]);
          	}
          }
        }else{
          console.log("err", err);
        }
        resolve(packages);
      });
    });
  }

  var ps = [];
  for(var index in keywords){
    ps.push(downloadKeys(keywords[index]));
  }

  // wait until all keywords are downloaded
  q.all(ps).then(function(){
  	self.hasDownloadedAllKeys = true;
    self.trigger("all-pkg-start", self.pkgs);
  });
}

// wait until every watcher has finished
workmen.prototype.listener = function(){
  var evtCounts = {};
  var handledPackages = 0;
  self.on("done-pkg", function(pkg){
    evtCounts[pkg.name]= (evtCounts[pkg.name] + 1) || 1;
    var lastListener = (self.registeredListeners === evtCounts[pkg.name]);
    if(lastListener){
      handledPackages++;
      // wait until all watchers for all keywords are done
      if(self.pkgs.length == handledPackages && self.hasDownloadedAllKeys){
        self.cb(self.pkgs);
      }
    }
  });
}

// starts the registry download task
workmen.prototype.start = function(){
	// TODO: assuming the existence of the hidden array might lead to unpredictable behavior
	this.registeredListeners = this._events["single-pkg-start"].length;
	this.listener();
	this.load(this.keywords);
}

require("biojs-events").mixin(workmen.prototype);
module.exports = workmen;
