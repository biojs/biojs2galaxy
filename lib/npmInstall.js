/*
 * biojs-galaxy
 * https://github.com/biojs/biojs-galaxy
 *
 * Copyright (c) 2014 BioJS
 * Licensed under the GPLv3
 */


var tmp = require('tmp');
var q = require('bluebird');
	
var path = require('path');
var join = require('path').join;
var fsp = require('fs-promise');
var exec = require('child-process-promise').exec;

var installer = function(){
}

installer.prototype.init = function(){
	var self = this;
	var initDir = new q.Promise(function(resolve, reject){
		tmp.dir(function _tempDirCreated(err, path) {
		  if (err) throw reject(err);

		  self.path = path;
		  console.log("#tmpdir: ", path);
		  resolve(path);
		});
	});

	return initDir;
}

installer.prototype.install = function(pkg, evt){

	console.log(pkg.name + ": installing");

	// the API to npm does not allow installation outside of the current directory node
	var cmd = 'npm install ' + pkg.name;
	exec(cmd, {cwd: this.path})
	    .then(function(result) {
	    	if(result.stderr.length != 0){
	        	console.log('stderr: ', result.stderr);
			}
			//console.log('stdout:\n', result.stdout);
	       	evt.trigger("installed-pkg", pkg);
	    })
	    .fail(function(err) {
	        console.error("ERROR: ", err);
	    })
}

module.exports = installer;