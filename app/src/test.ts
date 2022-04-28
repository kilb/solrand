import * as anchor from '@project-serum/anchor';

function hexStringToByte(str) {
    if (!str) {
        return new Uint8Array();
    }

    var a = [];
    for (var i = 0, len = str.length; i < len; i+=2) {
        a.push(parseInt(str.substr(i,2),16));
    }

    return new Uint8Array(a);
}

const byteArray = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 255, 254, 2, 33, 234, 215, 236, 127, 118, 9, 10, 11, 12, 13, 14, 115];
// var byteString = new TextDecoder().decode(byteArray);
// let str = Buffer.from(byteArray).toString();
let str = String.fromCharCode(...byteArray);
const commit = anchor.utils.sha256.hash(str.slice(0, 32));
const commitBytes = hexStringToByte(commit);
console.log(commitBytes);
console.log(str[0]);
