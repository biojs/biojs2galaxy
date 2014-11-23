biojs-galaxy
============

A fast tool to convert BioJS components into Galaxy visualization plugins.

__Warning__: This tool is in a __ALPHA__ stage. Use at your own risk.

It was tested so far with the [msa](https://github.com/greenify/biojs-vis-msa) component.

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

There are some predefined variables.

* `url` URL to your data file
* `dataType` dataType of your file
* `galaxyDiv` an existing div for your component
* `relativeURL` URL to your galaxy vis plugin


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

