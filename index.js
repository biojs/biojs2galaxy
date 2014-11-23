#!/usr/bin/env node

/*
 * biojs-galaxy
 * https://github.com/biojs/biojs-galaxy
 *
 * Copyright (c) 2014 BioJS
 * Licensed under the GPLv3
 */

var q = require('bluebird');
var fsp = require('fs-promise');
var path = require('path');
var join = require('path').join;

var NpmList = require("./lib/workmen.js");
var NpmInstall = require("./lib/npmInstall.js");
var MakoBrowserify = require('./lib/makoBrowserify');

var outFolder = process.argv[2] || join(process.cwd(), "build"); // where all galaxy plugins should be installed to
var tmpPath = ""; // will be set automatically

var instance = new NpmList(['galaxy-biojs', 'galaxy-vis'], function(pkgs){
	console.log("All packages have been installed. Congrats!");
});

var installer = new NpmInstall();

// the interaction between the workmen <-> npmInstaller and makoBrowserify is event-based
// here we define the routes the wire our tools together

// we have seen a  package -> begin to install
instance.on("single-pkg-start", installer.install.bind(installer));

// all keywords haven been downloaded
instance.on("all-pkg-start", function(pkgs){
	console.log("#pkgs: ", pkgs.length);
});

// package has been installed -> begin the mako toolchain
instance.on("installed-pkg", function(pkg){
	console.log(pkg.name + ": finished -> mako");	
	var inst = new MakoBrowserify({path: outFolder, tmpPath: tmpPath}, pkg);
	inst.build().then(function(){
		instance.trigger("done-pkg", pkg);
	},function(err){
		console.log("Error:", err);
	});
});

// a single package has been finalised
instance.on("done-pkg", function(pkg){
	console.log(pkg.name + ": success");
});

// lets start the party

fsp.remove(outFolder)
.then(function(){
	return fsp.mkdirp(outFolder)
}).then(function(){
	return installer.init();
}).then(function(){
	tmpPath = installer.path;
	instance.start();
},function(err){
	console.log("Error:", err);
});