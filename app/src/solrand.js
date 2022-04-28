// export ANCHOR_WALLET=/home/ke/.config/solana/id.json
// export ANCHOR_PROVIDER_URL="https://api.devnet.solana.com"
const anchor = require('@project-serum/anchor');
const { Program } = require('@project-serum/anchor');

const { PublicKey, Keypair, clusterApiUrl} = require('@solana/web3.js');
global.TextEncoder = require("util").TextEncoder;

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

const idl = require('./idl.json');
const programID = new PublicKey("RRRRRREjgzmDWKC4M9x5YVVRAXvf9RdGPbwgkfsgpsx");
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const wallet = provider.wallet;
const program = new Program(idl, programID, provider);

const assert = require("assert");
const fs = require('fs');

const priceFeedAccount1 = "J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"; //Crypto.SOL/USD
const AggregatorPublicKey1 = new PublicKey(priceFeedAccount1);
const priceFeedAccount2 = "8PugCXTAHLM9kfLSQWe2njE5pzAgUdpPk3Nx5zSm7BD3"; //Crypto.LUNA/USD
const AggregatorPublicKey2 = new PublicKey(priceFeedAccount2);
const priceFeedAccount3 = "EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9xvYBMZPie1Vw"; //Crypto.ETH/USD
const AggregatorPublicKey3 = new PublicKey(priceFeedAccount3);
const priceFeedAccount4 = "GwzBgrXb4PG59zjce24SF2b9JXbLEjJJTBkmytuEZj1b"; //Crypto.BNB/USD
const AggregatorPublicKey4 = new PublicKey(priceFeedAccount4);
const priceFeedAccount5 = "HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J"; //Crypto.BTC/USD
const AggregatorPublicKey5 = new PublicKey(priceFeedAccount5);
const priceFeedAccount6 = "8oGTURNmSQkrBS1AQ5NjB2p8qY34UVmMA9ojrw8vnHus"; //Crypto.ADA/USD
const AggregatorPublicKey6 = new PublicKey(priceFeedAccount6);
const priceFeedAccount7 = "4L6YhY8VvUgmqG5MvJkUJATtzB2rFqdrJwQCmFLv4Jzy"; //Crypto.DOGE/USD
const AggregatorPublicKey7 = new PublicKey(priceFeedAccount7);
const priceFeedAccount8 = "FVb5h1VmHPfVb1RfqZckchq18GxRv4iKt8T4eVTQAqdz"; //Crypto.AVAX/USD
const AggregatorPublicKey8 = new PublicKey(priceFeedAccount8);


let pool_id = new anchor.BN(1111);

async function createPool() {
  console.log("program id", program.programId.toBase58());
  const [pool_account_pda, _pool_account_bump] = await PublicKey.findProgramAddress(
    [pool_id.toBuffer("be", 8)],
    program.programId
  );

  console.log("pool_account_pda", pool_account_pda.toBase58());

  const tx = await program.rpc.createPool(
    pool_id,
    new anchor.BN(10), //commit与load最小间隔时间
    {
      accounts: {
        authority: wallet.publicKey,
        pool: pool_account_pda,
        feedAccount1: AggregatorPublicKey1,
        feedAccount2: AggregatorPublicKey2,
        feedAccount3: AggregatorPublicKey3,
        feedAccount4: AggregatorPublicKey4,
        feedAccount5: AggregatorPublicKey5,
        feedAccount6: AggregatorPublicKey6,
        feedAccount7: AggregatorPublicKey7,
        feedAccount8: AggregatorPublicKey8,
        systemProgram: anchor.web3.SystemProgram.programId,
      }
    });
  console.log("Your transaction signature", tx);
  return "OK";
}

async function commitRand(sec) {
  const [pool_account_pda, _pool_account_bump] = await PublicKey.findProgramAddress(
    [pool_id.toBuffer("be", 8)],
    program.programId
  );
  console.log("pool_account_pda", pool_account_pda.toBase58());

  let poolAccount2 = await program.account.pool.fetch(pool_account_pda);

  const [new_rand_pda, _new_rand_bump] = await PublicKey.findProgramAddress(
    [Buffer.from(anchor.utils.bytes.utf8.encode("rand")), pool_account_pda.toBuffer(), poolAccount2.length.toBuffer("be", 8)],
    program.programId
  );
  //sec 使用秘密函数随机生成，每次都需要变
  const commit = hexStringToByte(anchor.utils.sha256.hash(sec));

  const tx = await program.rpc.commitRand(
    commit,
    {
      accounts: {
        authority: wallet.publicKey,
        pool: pool_account_pda,
        newRand: new_rand_pda,
        systemProgram: anchor.web3.SystemProgram.programId,
      }
    });
  console.log("Your transaction signature", tx);
  let randAccount = await program.account.rand.fetch(new_rand_pda);
  assert.ok(
    randAccount.commit == commit
  );
  return "OK"
}

async function loadRand(randID) {
  const [pool_account_pda, _pool_account_bump] = await PublicKey.findProgramAddress(
    [pool_id.toBuffer("be", 8)],
    program.programId
  );
  
  const [cur_rand_pda, _cur_rand_bump] = await PublicKey.findProgramAddress(
    [Buffer.from(anchor.utils.bytes.utf8.encode("rand")), pool_account_pda.toBuffer(), new anchor.BN(randID).toBuffer("be", 8)],
    program.programId
  );

  const tx = await program.rpc.loadRand(
    new anchor.BN(randID),
    {
      accounts: {
        authority: wallet.publicKey,
        pool: pool_account_pda,
        curRand: cur_rand_pda,
        feedAccount1: AggregatorPublicKey1,
        feedAccount2: AggregatorPublicKey2,
        feedAccount3: AggregatorPublicKey3,
        feedAccount4: AggregatorPublicKey4,
        feedAccount5: AggregatorPublicKey5,
        feedAccount6: AggregatorPublicKey6,
        feedAccount7: AggregatorPublicKey7,
        feedAccount8: AggregatorPublicKey8,
        systemProgram: anchor.web3.SystemProgram.programId,
      }
    });
  console.log("Your transaction signature", tx);

  return "OK"
}

async function revealRand(randID, sec) {
  const [pool_account_pda, _pool_account_bump] = await PublicKey.findProgramAddress(
    [pool_id.toBuffer("be", 8)],
    program.programId
  );
  
  const [cur_rand_pda, _cur_rand_bump] = await PublicKey.findProgramAddress(
    [Buffer.from(anchor.utils.bytes.utf8.encode("rand")), pool_account_pda.toBuffer(), new anchor.BN(randID).toBuffer("be", 8)],
    program.programId
  );

  const tx = await program.rpc.revealRand(
    new anchor.BN(randID),
    sec,
    {
      accounts: {
        authority: wallet.publicKey,
        pool: pool_account_pda,
        curRand: cur_rand_pda,
        systemProgram: anchor.web3.SystemProgram.programId,
      }
    });
  console.log("Your transaction signature", tx);

  return "OK"
}

async function closeRand(randID) {
  const [_pool_account_pda, _pool_account_bump] = await PublicKey.findProgramAddress(
    [pool_id.toBuffer("be", 8)],
    program.programId
  );
  
  const [cur_rand_pda, _cur_rand_bump] = await PublicKey.findProgramAddress(
    [Buffer.from(anchor.utils.bytes.utf8.encode("rand")), pool_account_pda.toBuffer(), new anchor.BN(randID).toBuffer("be", 8)],
    program.programId
  );

  const tx = await program.rpc.closeRand(
    new anchor.BN(randID),
    {
      accounts: {
        authority: wallet.publicKey,
        pool: pool_account_pda,
        curRand: cur_rand_pda,
        systemProgram: anchor.web3.SystemProgram.programId,
      }
    });
  console.log("Your transaction signature", tx);

  return "OK"
}

const mysec = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 255, 254, 2, 33, 234, 215, 236, 127, 118, 9, 10, 11, 12, 13, 14, 115];
createPool().then(console.log);
commitRand(mysec).then(console.log);
loadRand(0).then(console.log);
revealRand(0, mysec).then(console.log);