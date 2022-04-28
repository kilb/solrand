// 修改此处的环境变量，运行前先设置环境变量
// export ANCHOR_WALLET=/home/ke/.config/solana/id.json
// export ANCHOR_PROVIDER_URL="https://api.devnet.solana.com"
import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

const idl = require('./idl.json');

const programID = new PublicKey(idl.metadata.address);

//修改此处的pool id 及对应的token地址
let pool_id = new anchor.BN(6);
const tokenUserAccount = "CMcmPxyd2m92f2GAUea1zTkparTZZQzkz8Fn2JFoAozB";
const token_user = new PublicKey(tokenUserAccount);

const provider = anchor.Provider.env();
anchor.setProvider(provider);
const wallet = provider.wallet;
const program = new Program(idl, programID, provider);

let roundID = null as anchor.BN;
let pool_account_pda;

async function init() {
  const [_pool_account_pda, _pool_account_bump] = await PublicKey.findProgramAddress(
    [pool_id.toBuffer("be", 8)],
    program.programId
  );
  pool_account_pda = _pool_account_pda;

  let poolAccount = await program.account.pool.fetch(pool_account_pda);
  roundID = poolAccount.nextRound.subn(1);
  return "Init OK";
}

async function betRound(flag: number, amount: number, round: anchor.BN) {
  const [cur_round_pda, _cur_round_bump] = await PublicKey.findProgramAddress(
    [Buffer.from(anchor.utils.bytes.utf8.encode("round")), pool_account_pda.toBuffer(), round.toBuffer("be", 8)],
    program.programId
  );

  const [token_vault_pda, _token_vault_bump] = await PublicKey.findProgramAddress(
    [Buffer.from(anchor.utils.bytes.utf8.encode("token")), cur_round_pda.toBuffer()],
    program.programId
  );

  const [user_bet_pda, _user_bet_bump] = await PublicKey.findProgramAddress(
    [Buffer.from(anchor.utils.bytes.utf8.encode("bet")), cur_round_pda.toBuffer(), wallet.publicKey.toBuffer()],
    program.programId
  );

  const tx = await program.rpc.bet(
    new anchor.BN(amount), // bet amount
    flag,
    {
      accounts: {
        authority: wallet.publicKey,
        tokenVault: token_vault_pda,
        tokenUser: token_user,
        curRound: cur_round_pda,
        userBet: user_bet_pda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      }
    });
  return tx;
}

async function claimRound(round: anchor.BN) {
  const [claim_round_pda, _claim_round_bump] = await PublicKey.findProgramAddress(
    [Buffer.from(anchor.utils.bytes.utf8.encode("round")), pool_account_pda.toBuffer(), round.toBuffer("be", 8)],
    program.programId
  );

  const [token_vault_pda, _token_vault_bump] = await PublicKey.findProgramAddress(
    [Buffer.from(anchor.utils.bytes.utf8.encode("token")), claim_round_pda.toBuffer()],
    program.programId
  );

  const [user_bet_pda, _user_bet_bump] = await PublicKey.findProgramAddress(
    [Buffer.from(anchor.utils.bytes.utf8.encode("bet")), claim_round_pda.toBuffer(), wallet.publicKey.toBuffer()],
    program.programId
  );

  const tx = await program.rpc.claim(
    {
      accounts: {
        authority: wallet.publicKey,
        pool: pool_account_pda,
        tokenVault: token_vault_pda,
        tokenUser: token_user,
        curRound: claim_round_pda,
        userBet: user_bet_pda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      }
    });
  return tx;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

// process.on('uncaughtException', (err, origin) => {
//   console.log(
//     process.stderr.fd,
//     `Caught exception: ${err}\n` +
//     `Exception origin: ${origin}`
//   );
// });

(async () => {
  await init().then(console.log);
  while(true) {
    //本轮投注的上下限
    let down = getRandomInt(8000, 12000);
    let up = getRandomInt(8000, 12000);
    while(true) {
      try {
        let poolAccount = await program.account.pool.fetch(pool_account_pda);
        let newRoundID = poolAccount.nextRound.subn(1);
        if (!newRoundID.eq(roundID)) {
          roundID = newRoundID;
          break;
        }
      } catch (err) {
        console.log("Get pool account error: ", err);
      }
      
      if(Math.random() > 0.5) {
        // 共投注约15次，最小投注0.01u
        let amount = getRandomInt(1, up / 7) * 10000;
        try {
          await betRound(1, amount, roundID);
        } catch (err) {
          console.log("Bet up error: ", err);
        }
        console.log("Bet UP: ", amount);
      } else {
        // 共投注约15次
        let amount = getRandomInt(1, down / 7) * 10000;
        try {
          await betRound(0, amount, roundID);
        } catch (err) {
          console.log("Bet down error: ", err);
        }
        console.log("Bet Down: ", amount);
      }
      await sleep(6000);
    }
    try {
      await claimRound(roundID.subn(2));
      console.log("Claim Round: ", roundID.subn(2).toNumber());
    } catch (err) {
      console.log("Claim error: ", err);
    }
  }

})();