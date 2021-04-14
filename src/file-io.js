// FILE INPUT-OUTPUT

// File system i/o
const fs = require('fs');


// Local file system

exports.existsLocalSync = function(path) {
  return fs.existsSync(path)
}

exports.mkdirLocalSync = function (path) {
  fs.mkdirSync(path, { recursive: true });
}

exports.readLocalSync = function (path) {
  return JSON.parse(fs.readFileSync(path));
}

exports.writeLocalSync = function (path, json) {
    fs.writeFileSync(path, JSON.stringify(json), err => {
        if (err) throw err;
    });
    //console.log("debug: ", JSON.stringify(json), " written to ", path);
}