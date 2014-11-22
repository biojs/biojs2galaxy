/*
 * biojs-galaxy
 * https://github.com/biojs/biojs-galaxy
 *
 * Copyright (c) 2014 BioJS
 * Licensed under the GPLv3
 */

var NpmList = require("./lib/workmen.js");
var NpmInstall = require("./lib/npm-install.js");

var instance = new NpmList(['galaxy-biojs', 'galaxy-vis'], function(pkgs){
	console.log("installation done.");
});

var installer = new NpmInstall();
var tmpPath = "";

instance.on("single-pkg-start", installer.install.bind(installer));

instance.on("all-pkg-start", function(pkgs){
	console.log("#pkgs: ", pkgs.length);
});

installer.init().then(function(){
	tmpPath = installer.path;
	return instance.start.bind(instance);
}
, function(err){
	console.log("No free memory. Unable to create temp dir.", err)
});