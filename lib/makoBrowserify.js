/*
 * biojs-galaxy
 * https://github.com/biojs/biojs-galaxy
 *
 * Copyright (c) 2014 BioJS
 * Licensed under the GPLv3
 */

var fsp = require('fs-promise');
var q = require('bluebird');
var path = require('path');
var join = require('path').join;
var streamToPromise = require("stream-to-promise");
var rp = require('request-promise');
var slug = require('to-slug');

// browserify
var browserify = require("browserify");
var streamify = require('gulp-streamify'); 
var chmod = require('gulp-chmod');
var source = require('vinyl-source-stream');
var uglify = require('gulp-uglify');
var gulp   = require('gulp');

// makos
var Mustache = require("mustache");

var Mako = function(obj, pkg){
	this.path = obj.path;
	this.tmpPath = obj.tmpPath;
	this.pkg = pkg;

	this.pkgPath = join(this.tmpPath, "node_modules", pkg.name);
	this.outPath = join(this.path, pkg.name);

	var fs = require("fs");

	this.config = require(join(this.pkgPath, "package.json"));
	this.slug = slug(this.config.name);
	this.js = [];
	this.css = [];
}

// bundles all resources
Mako.prototype.build = function(){

	var self = this;

	// init structure
	return q.all(q.map(["config", "static", "templates"], function(dir){
		return fsp.mkdirp(join(self.outPath, dir));
	})).then(function(){
		var ps = [];

		ps.push(self.browserify.call(self));
		ps.push(self.resourcify.call(self, self.config.sniper.js, self.js));
		ps.push(self.resourcify.call(self, self.config.sniper.css, self.css));
		ps.push(self.configy.call(self));

		return q.all(ps);
	}).then(function(){
		// ensure that the browserified source is the last one
		self.js.push(self.browserifiedName);
		return self.makoify.call(self);
	});
}

// generate the browserify build
Mako.prototype.browserify = function(){

	var self = this;

	// exposes other packages (exposed by the package)
	function exposeBundles(b){
	  b.add(self.config.main, {expose: self.config.name });
	  if(self.config.sniper !== undefined && self.config.sniper.exposed !== undefined){
	    for(var i=0; i<self.config.sniper.exposed.length; i++){
	      b.require(self.config.sniper.exposed[i]);
	    }
	  }
	}

	var b = browserify({hasExports: true, basedir: self.pkgP});
		exposeBundles(b);
		var name = self.slug + ".min.js";
		self.browserifiedName = name;
		return streamToPromise(b.bundle()
	    .pipe(source(name))
	    .pipe(chmod(644))
	    .pipe(streamify(uglify()))
	    .pipe(gulp.dest(join(self.outPath, "static"))));

}

// downloads an array of specified dependencies
Mako.prototype.resourcify = function(obj, arr){
	var self = this;
	var dest = join(self.outPath, "static");
	return new q.Promise(function(resolve, reject){
		var ps = [];
		if(obj != undefined){
			obj.forEach(function(js){
    			if(js.substring(0,7) === "/build/"){
    				// ignore browserify builds
      				return;
    			} else if(js.substring(0,4) === "http"){
      				// download to dir
      				var name = path.basename(js);
      				ps.push(rp(js).then(function(body){
      					arr.push(name);
      					return fsp.writeFile(join(dest, name), body);
      				}));
    			} else{
    				var name = path.basename(js);
    				arr.push(name);
    				ps.push(fsp.copy(join(self.pkgPath, js),join(dest, name)));		
    			}
			});
			q.all(ps).then(function(){
				resolve();
			})
		}else{
			// js dependencies are needed
			if(arr == "js"){
				reject(self.config.name + ": No config found for " + arr);
			}else{
				// css is optional
				resolve();
			}
		}
	});
}

// builds the galaxy template mako
Mako.prototype.makoify = function(){
	var self = this;
	var name = self.config.name;
	var dest = join(self.outPath, "templates", name + ".mako");
	var jsContent = "";
	var mako = "";

	var ps = [];

	ps.push(fsp.readFile(join(self.pkgPath, "/galaxy.mako"), "utf8").then(function(content){
		jsContent = content;
	}));

	ps.push(fsp.readFile(join(__dirname, "..", "template", "galaxy.mako"), "utf8").then(function(content){
		mako = content;
	}));


	return q.all(ps).then(function(content){
		content = Mustache.render(mako, {jsContent:  jsContent, css: self.css, js: self.js, name: name});
		return fsp.writeFile(dest,content);
	});
}

// builds the galaxy config xml
Mako.prototype.configy = function(){
	var self = this;
	var name = self.config.name;
	var dest = join(self.outPath, "config", name + ".xml");

	if(self.config.galaxy == undefined || self.config.galaxy.datatypes == undefined){
		return new q.Promise(function(resolve, reject){
			reject("warning: no galaxy entry in the package.json of " + name);
		});
	}

	return fsp.readFile(join(__dirname, "..", "template", "galaxy.xml"), "utf8").then(function(content){
		var content = Mustache.render(content, {name:  name, dataSources: self.config.galaxy.datatypes});
		return fsp.writeFile(dest,content);
	});
}

module.exports = Mako;