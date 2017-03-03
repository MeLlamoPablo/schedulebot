// TODO this file shouldn't probably make it to prod

const path = require("path");
const fs = require("fs");

let setupPath = path.join(__dirname, "../node_modules/schedulebot-setup");

let deleteFolderRecursive = function(path) {
	if( fs.existsSync(path) ) {
		fs.readdirSync(path).forEach(function(file,index){
			let curPath = path + "/" + file;
			if(fs.lstatSync(curPath).isDirectory()) { // recurse
				deleteFolderRecursive(curPath);
			} else { // delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
};

deleteFolderRecursive(setupPath);

console.log("node_modules/schedulebot-setup deleted; you may now shut down this process.");

process.stdin.resume();