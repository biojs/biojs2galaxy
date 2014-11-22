var tmp = require('tmp');
var q = require('bluebird');
	
var path = require('path');
var join = require('path').join;
var fsp = require('fs-promise');

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

	/*
	var copyPackgeJson = function(resolve,reject){
		var p = join(self.path, "package.json");
		console.log("p", p);
		return fsp.copy(__dirname + "/../template/package.json", p)
	};
	*/

	return initDir;
	//.then(copyPackgeJson);
}

installer.prototype.install = function(pkg, evt){
	var exec = require('child-process-promise').exec;

	exec('npm install '+ pkg.name, {cwd: this.path})
	    .then(function(result) {
	    	if(result.stderr.length != 0){
	        	console.log('stderr: ', result.stderr);
			}
	       	evt.trigger("done-pkg", pkg);
	    })
	    .fail(function(err) {
	        console.error("ERROR: ", err);
	    })
}

module.exports = installer;