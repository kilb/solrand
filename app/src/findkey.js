const web3 =  require('@solana/web3.js');
const splToken = require('@solana/spl-token');
const {Keypair} = require("@solana/web3.js");
const anchor = require('@project-serum/anchor');
const fs = require('fs');

function findKeypair() {
    let key = anchor.web3.Keypair.generate();
    let addr = key.publicKey.toBase58();
    if(addr.slice(0,1) == "P") {
        console.log("fond:", key.secretKey);
        console.log("fond:", addr);
    }
    return addr;
}

function getKeypair() {
    let data = fs.readFileSync('/home/ke/code/solgame/solpat/target/deploy/solpat-keypair.json', 'utf8');
    let secretKey = Uint8Array.from(JSON.parse(data));
    return Keypair.fromSecretKey(secretKey);
}

while(1) {
    global.TextEncoder = require("util").TextEncoder; 
    let key = getKeypair();
    console.log("fond:", key.secretKey);
    console.log("fond:", key.publicKey.toBase58());
}
