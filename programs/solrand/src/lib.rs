use anchor_lang::prelude::*;
use pyth_client::{load_price, Price};
use sha2::{Sha256, Digest};

declare_id!("RRRRRREjgzmDWKC4M9x5YVVRAXvf9RdGPbwgkfsgpsx");

fn update_hash(hasher: &mut Sha256, price: &Price) {
    hasher.update(price.prev_slot.to_be_bytes());
    hasher.update(price.prev_price.to_be_bytes());
    hasher.update(price.prev_conf.to_be_bytes());
    hasher.update(price.agg.conf.to_be_bytes());
    hasher.update(price.agg.price.to_be_bytes());
    hasher.update(price.agg.pub_slot.to_be_bytes());
    hasher.update(price.agg.conf.to_be_bytes());
}

#[program]
pub mod solrand {
    use super::*;
    pub fn create_pool(
        ctx: Context<CreatePool>,
        pool_id: u64,
        duration: i64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.pool_id = pool_id;
        pool.authority = ctx.accounts.authority.key();
        pool.min_duration = duration;
        pool.length = 0;
        pool.feed_accounts[0] = ctx.accounts.feed_account1.key();
        pool.feed_accounts[1] = ctx.accounts.feed_account2.key();
        pool.feed_accounts[2] = ctx.accounts.feed_account3.key();
        pool.feed_accounts[3] = ctx.accounts.feed_account4.key();
        pool.feed_accounts[4] = ctx.accounts.feed_account5.key();
        pool.feed_accounts[5] = ctx.accounts.feed_account6.key();
        pool.feed_accounts[6] = ctx.accounts.feed_account7.key();
        pool.feed_accounts[7] = ctx.accounts.feed_account8.key();
        Ok(())
    }

    pub fn commit_rand(ctx: Context<CommitRand>, commit: [u8; 32]) -> Result<()> {
        let now_ts = Clock::get().unwrap().unix_timestamp;
        let new_rand = &mut ctx.accounts.new_rand;
        let pool = &mut ctx.accounts.pool;
        new_rand.commit_time = now_ts;
        new_rand.commit = commit;
        new_rand.status = 0;
        pool.length += 1;
        emit!(DidCommit {
            commit_time: now_ts,
            rand_id: pool.length - 1,
            pool_id: pool.pool_id,
            commit: commit,
        });
        Ok(())
    }

    pub fn load_rand(ctx: Context<LoadRand>, rand_id: u64) -> Result<()> {
        let clock = Clock::get().unwrap();
        let now_ts = clock.unix_timestamp;
        let cur_rand = &mut ctx.accounts.cur_rand;
        cur_rand.load_time = now_ts;
        let mut hasher = Sha256::new();
        update_hash(&mut hasher, load_price(&ctx.accounts.feed_account1.try_borrow_data()?).unwrap());
        update_hash(&mut hasher, load_price(&ctx.accounts.feed_account2.try_borrow_data()?).unwrap());
        update_hash(&mut hasher, load_price(&ctx.accounts.feed_account3.try_borrow_data()?).unwrap());
        update_hash(&mut hasher, load_price(&ctx.accounts.feed_account4.try_borrow_data()?).unwrap());
        update_hash(&mut hasher, load_price(&ctx.accounts.feed_account5.try_borrow_data()?).unwrap());
        update_hash(&mut hasher, load_price(&ctx.accounts.feed_account6.try_borrow_data()?).unwrap());
        update_hash(&mut hasher, load_price(&ctx.accounts.feed_account7.try_borrow_data()?).unwrap());
        update_hash(&mut hasher, load_price(&ctx.accounts.feed_account8.try_borrow_data()?).unwrap());
        hasher.update(clock.slot.to_be_bytes());
        hasher.update(now_ts.to_be_bytes());
        hasher.update(cur_rand.commit_time.to_be_bytes());
        cur_rand.seed.copy_from_slice(&hasher.finalize()[..]);
        cur_rand.status = 1;
        emit!(DidLoad {
            rand_id: rand_id,
            load_time: now_ts,
            seed: cur_rand.seed,
        });
        Ok(())
    }

    pub fn reveal_rand(ctx: Context<RevealRand>, rand_id: u64, sec: [u8; 32]) -> Result<()> {
        let now_ts = Clock::get().unwrap().unix_timestamp;
        let cur_rand = &mut ctx.accounts.cur_rand;
        
        let mut hasher = Sha256::new();
        hasher.update(sec);
        let hash = &hasher.finalize()[0..32];
        if hash != &cur_rand.commit {
            return Err(ProgramError::InvalidInstructionData.into());
        }
        let mut hasher = Sha256::new();
        hasher.update(sec);
        hasher.update(cur_rand.seed);
        let rand_bytes = &hasher.finalize()[..];
        for i in 0..8 {
            cur_rand.rands[i] = u32::from_be_bytes(rand_bytes[i<<2..(i+1)<<2].try_into().unwrap());
        }
        cur_rand.status = 2;
        emit!(DidReveal {
            rand_id: rand_id,
            reveal_time: now_ts,
            sec: sec,
            rands: cur_rand.rands,
        });
        Ok(())
    }

    pub fn close_rand(_ctx: Context<CloseRand>, rand_id: u64) -> Result<()> {
        let now_ts = Clock::get().unwrap().unix_timestamp;
        emit!(DidClose {
            rand_id: rand_id,
            close_time: now_ts,
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct CreatePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        seeds = [pool_id.to_be_bytes().as_ref()],
        bump,
        payer = authority,
        space = 8 + Pool::LEN
    )]
    pub pool: Box<Account<'info, Pool>>,
    /// CHECK:AccountsExit
    pub feed_account1: AccountInfo<'info>,
    /// CHECK:AccountsExit
    pub feed_account2: AccountInfo<'info>,
    /// CHECK:AccountsExit
    pub feed_account3: AccountInfo<'info>,
    /// CHECK:AccountsExit
    pub feed_account4: AccountInfo<'info>,
    /// CHECK:AccountsExit
    pub feed_account5: AccountInfo<'info>,
    /// CHECK:AccountsExit
    pub feed_account6: AccountInfo<'info>,
    /// CHECK:AccountsExit
    pub feed_account7: AccountInfo<'info>,
    /// CHECK:AccountsExit
    pub feed_account8: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CommitRand<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        has_one = authority,
    )]
    pub pool: Account<'info, Pool>,
    #[account(
        init,
        seeds = [b"rand", pool.key().as_ref(), pool.length.to_be_bytes().as_ref()],
        bump,
        payer = authority,
        space = 8 + Rand::LEN
    )]
    pub new_rand: Box<Account<'info, Rand>>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
#[instruction(rand_id: u64)]
pub struct LoadRand<'info> {
    pub authority: Signer<'info>,
    #[account(
        has_one = authority,
        constraint = pool.feed_accounts[0] == feed_account1.key(),
        constraint = pool.feed_accounts[1] == feed_account2.key(),
        constraint = pool.feed_accounts[2] == feed_account3.key(),
        constraint = pool.feed_accounts[3] == feed_account4.key(),
        constraint = pool.feed_accounts[4] == feed_account5.key(),
        constraint = pool.feed_accounts[5] == feed_account6.key(),
        constraint = pool.feed_accounts[6] == feed_account7.key(),
        constraint = pool.feed_accounts[7] == feed_account8.key()
    )]
    pub pool: Account<'info, Pool>,
    #[account(
        mut,
        seeds = [b"rand", pool.key().as_ref(), rand_id.to_be_bytes().as_ref()],
        bump,
        constraint = cur_rand.commit_time + pool.min_duration <= Clock::get().unwrap().unix_timestamp,
        constraint = cur_rand.status == 0,
    )]
    pub cur_rand: Box<Account<'info, Rand>>,
    /// CHECK:AccountsExit
    pub feed_account1: AccountInfo<'info>,
    /// CHECK:AccountsExit
    pub feed_account2: AccountInfo<'info>,
    /// CHECK:AccountsExit
    pub feed_account3: AccountInfo<'info>,
    /// CHECK:AccountsExit
    pub feed_account4: AccountInfo<'info>,
    /// CHECK:AccountsExit
    pub feed_account5: AccountInfo<'info>,
    /// CHECK:AccountsExit
    pub feed_account6: AccountInfo<'info>,
    /// CHECK:AccountsExit
    pub feed_account7: AccountInfo<'info>,
    /// CHECK:AccountsExit
    pub feed_account8: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(rand_id: u64)]
pub struct RevealRand<'info> {
    pub authority: Signer<'info>,
    #[account(
        has_one = authority,
    )]
    pub pool: Account<'info, Pool>,
    #[account(
        mut,
        seeds = [b"rand", pool.key().as_ref(), rand_id.to_be_bytes().as_ref()],
        bump,
        constraint = cur_rand.status == 1,
    )]
    pub cur_rand: Account<'info, Rand>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(rand_id: u64)]
pub struct CloseRand<'info> {
    pub authority: Signer<'info>,
    #[account(
        has_one = authority,
    )]
    pub pool: Account<'info, Pool>,
    #[account(
        mut,
        seeds = [b"rand", pool.key().as_ref(), rand_id.to_be_bytes().as_ref()],
        bump,
        close = authority,
    )]
    pub cur_rand: Account<'info, Rand>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct Pool {
    pub pool_id: u64,
    // Priviledged account.
    pub authority: Pubkey,
    pub min_duration: i64,
    pub length: u64,
    // price feed as random seed
    pub feed_accounts: [Pubkey; 8],
}

impl Pool {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 32 * 8;
}

#[account]
#[derive(Default)]
pub struct Rand {
    pub commit_time: i64,
    pub load_time: i64,
    pub commit: [u8; 32],
    pub seed: [u8; 32],
    pub rands: [u32; 8],
    // 0: commited, 1: loaded, 2: commited
    pub status: u8,
}

impl Rand {
    pub const LEN: usize = 8 + 8 + 32 + 32 + 32 + 1;
}

#[event]
pub struct DidCommit {
    commit_time: i64,
    rand_id: u64,
    pool_id: u64,
    commit: [u8; 32]
}

#[event]
pub struct DidLoad {
    rand_id: u64,
    load_time: i64,
    seed: [u8; 32]
}

#[event]
pub struct DidReveal {
    rand_id: u64,
    reveal_time: i64,
    sec: [u8; 32],
    rands: [u32; 8],
}

#[event]
pub struct DidClose {
    rand_id: u64,
    close_time: i64,
}

