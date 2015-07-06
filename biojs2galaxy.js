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
var path = require('path');
var tmp = require('tmp');
var _ = require('lodash');
var log = minilog("main");

var NpmList = require("./lib/workmen.js");
var NpmInstall = require("./lib/npmInstall.js");
var MakoBrowserify = require('./lib/makoBrowserify');

var config = require(__dirname + '/package.json');
program
  .version(config.version)
  .usage('[packages]')
  .description('Automated import of biojs components into galaxy')
  .option('-v, --verbose', 'Increase verbosity', false)
  .option('-a, --all', 'Download all packages from npm', false)
  .option('-o, --output [folder]', 'Output folder', join(process.cwd(), 'build'))
  .option('-p, --path [path]', 'Path to local package')
  .option('-r, --remove', 'Clear output folder', false)
  .parse(process.argv);

// logging
if (program.verbose) {
  minilog
    .suggest
    .clear()
    .deny('verbose', 'trace');
}
minilog.enable();

// where all galaxy plugins should be installed to
var pkgs = [];

// modes
var modes = {
  localMode: !!program.path,
  downloadAll: !!program.all,
};

if (typeof program.args !== 'undefined' && program.args.length > 0) {
  pkgs = program.args[0];
  pkgs = pkgs.split(",").map(function(s) {
    return s.trim();
  });
} else if (_.compact(_.values(modes)).length == 0) {
  console.error("Please choose an option");
  program.help();
}

var opts = {
  path: program.output,
  tmpPath: ''
};

var tagList = ['galaxy-biojs', 'galaxy-vis'];

if (opts.path[0] != "/") {
  opts.path = process.cwd() + "/" + opts.path;
}

var chainReady = q.resolve();
if (program.remove) {
  chainReady = fsp.remove(opts.path);
}
chainReady = chainReady.then(function() {
  return fsp.mkdirp(opts.path);
});

if (modes.localMode) {

  opts.tmpPath = program.path;
  if (opts.tmpPath != "/") {
    opts.tmpPath = process.cwd() + "/" + opts.tmpPath;
  }
  chainReady.then(function() {
    var pkg = require(program.path + "/package.json");
    log.info(pkg.name + ": starting -> mako");

    var localOpts = _.extend({
      local: true,
    }, opts);
    var inst = new MakoBrowserify(pkg, localOpts);
    return inst.build().then(function() {
      log.info("saved to ", opts.opts);
      log.info("copy the component folder to config/plugins/visualizations/ of your galaxy installation and enable vis plugins");
    }, function(err) {
      log.error("Error:", err);
    });

  });

} else {

  // init tmp directory needed for installer
  var installer = new NpmInstall();
  chainReady = chainReady.then(function() {
    return installer.init();
  }).then(function() {
    opts.tmpPath = installer.path;
  });

  var instance = new NpmList({keywords: tagList}, function(pkgs) {
    log.info("All packages have been installed. Congrats!");
  });

  // BIND event streams

  // we have seen a  package -> begin to install
  instance.on("single-pkg-start", installer.install.bind(installer));

  // package has been installed -> begin the mako toolchain
  instance.on("installed-pkg", function(pkg) {
    log.info(pkg.name + ": finished -> mako");
    var inst = new MakoBrowserify(pkg, opts);
    inst.build().then(function() {
      instance.trigger("done-pkg", pkg);
    }, function(err) {
      log.error("Error:", err);
    });
  });

  // a single package has been finalised
  instance.on("done-pkg", function(pkg) {
    log.debug(pkg.name + ": success");
  });

  chainReady.then(function() {
    if (modes.downloadAll) {
      instance.start();
    } else {
      instance.start(pkgs);
    }
  });
}

chainReady.error(function(err) {
  log.error(err);
});
