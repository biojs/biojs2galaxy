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
var program = require('commander');
var minilog = require('minilog');

var NpmList = require("./lib/workmen.js");
var NpmInstall = require("./lib/npmInstall.js");
var MakoBrowserify = require('./lib/makoBrowserify');

program
  .version(require(__dirname + '/package.json').version)
  .usage('[options] [files]')
  .option('-v, --verbose', 'Increase verbosity', false)
  .option('-p, --path [path]', 'Path to local package')
  .parse(process.argv);

if (program.verbose) {
  minilog.enable();
}

// where all galaxy plugins should be installed to
var outFolder;
if (program.args.length > 0) {
  outFolder = program.args[0];
} else {
  outFolder = join(process.cwd(), "build");
}

var tmpPath = ""; // will be set automatically


var tmp = require('tmp');

// local debug mode - use the 
var localMode = "path" in program;
if (localMode) {

  if (program.path.length == 0) {
    program.path = process.cwd();
  }
  if (program.path[0] != "/") {
    program.path = process.cwd() + "/" + program.path;
  }

  function start() {
    var pkg = require(program.path + "/package.json");
    console.log(pkg.name + ": starting -> mako");
    var inst = new MakoBrowserify({
      path: outFolder,
      tmpPath: program.path,
      local: true
    }, pkg);
    inst.build().then(function() {
      console.log("saved to ", outFolder);
    }, function(err) {
      console.log("Error:", err);
    });
  }

  fsp.remove(outFolder)
    .then(function() {
      return fsp.mkdirp(outFolder);
    }).then(function() {
      start();
    }, function(err) {
      console.log("Error:", err);
    });

} else {

  var tagList = ['galaxy-biojs', 'galaxy-vis'];
  var instance = new NpmList(tagList, function(pkgs) {
    console.log("All packages have been installed. Congrats!");
  });

  var installer = new NpmInstall();

  // the interaction between the workmen <-> npmInstaller and makoBrowserify is event-based
  // here we define the routes the wire our tools together

  // we have seen a  package -> begin to install
  instance.on("single-pkg-start", installer.install.bind(installer));

  // all keywords haven been downloaded
  instance.on("all-pkg-start", function(pkgs) {
    console.log("#pkgs: ", pkgs.length);
  });

  // package has been installed -> begin the mako toolchain
  instance.on("installed-pkg", function(pkg) {
    console.log(pkg.name + ": finished -> mako");
    var inst = new MakoBrowserify({
      path: outFolder,
      tmpPath: tmpPath
    }, pkg);
    inst.build().then(function() {
      instance.trigger("done-pkg", pkg);
    }, function(err) {
      console.log("Error:", err);
    });
  });

  // a single package has been finalised
  instance.on("done-pkg", function(pkg) {
    console.log(pkg.name + ": success");
  });

  // lets start the party

  fsp.remove(outFolder)
    .then(function() {
      return fsp.mkdirp(outFolder);
    }).then(function() {
      return installer.init();
    }).then(function() {
      tmpPath = installer.path;
      instance.start();
    }, function(err) {
      console.log("Error:", err);
    });

}
