biojs-galaxy
============

[![NPM version](http://img.shields.io/npm/v/biojs-galaxy.svg)](https://www.npmjs.org/package/biojs-galaxy)

A fast tool to convert BioJS components into Galaxy visualization plugins.

__Warning__: This tool is in a __ALPHA__ stage. Use at your own risk.

It was tested so far with the

* [msa](https://github.com/greenify/biojs-vis-msa) component.
* [sequence](https://github.com/ljgarcia/biojs-vis-sequence)

How to add a (BioJS) Plugin
--------------------


1) Define your data types in the package.json

```
  "galaxy": {
    "datatypes": ["sequence.Fasta", "sequences", "msa.clustal"]
  }
```

2) Add the `galaxy-vis` keyword to your package.json


So your keyword list could look like this.
```
keywords = ["biojs", "galaxy-vis"]
```

3) Define a custom `galaxy.mako` (package root)

```
var xhr = require("xhr");
xhr(url, function(err, response,text){
	galaxyDiv.textContent = response;
	console.log("datatype", dataType);
});
```

4) Check whether you have defined correct [sniper](https://github.com/biojs/biojs-sniper) settings.

There are some predefined variables.

* `url` raw URL to your data file
* `dataType` dataType of your file
* `galaxyDiv` an existing div for your component
* `relativeURL` URL to your galaxy vis plugin
* `jsonURL` URL to your data file (wrapped in a JSON object - only use this if the API throws an error the raw file

TODO: read more settings like a data provider from the package.json 

How does it work
---------------

1) Query npm: "give me all package with the "galaxy-vis tag"
2) For every package (async)
a) Download the package and install its dependencies
b) Browserify the package and copy the output to /static/{{name}}
c) Copy the js and css resources defined in the biojs sniper settings to static (http links are downloaded)
d) Copy the `galaxy.mako` into a [mako template](https://github.com/biojs/biojs-galaxy/blob/master/template/galaxy.mako)
e) Generate a config file based on the specified data types

How to run
-------------

Install:

```
npm install -g biojs-galaxy
```

Run:

```
biojs-galaxy
```

Specify a specific output folder (default: `$(pwd)/build`

```
biojs-galaxy <folder>
```

(You need npm & node, of course)

How to develop
-----------

```
git clone https://github.com/biojs/biojs-galaxy
cd biojs-galaxy
npm install
node index.js
```

