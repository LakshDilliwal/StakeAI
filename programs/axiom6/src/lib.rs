use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::instruction::Instruction;

pub mod errors;
pub mod state;

use errors::*;
use state::*;

declare_id!("2aFgAGbsujHkPyaHFyqUy5wPNCmPmYsbv9AtxS9FpykJ");

pub const JUPITER_PROGRAM_ID: Pubkey = pubkey!("JUP6LkbZbjS1jKKwapdH67y95eVxmA58WwNiE8kQc6a");
pub const MAX_PERFORMANCE_FEE_BPS: u16 = 3000;
pub const SHARES_MULTIPLIER: u64 = 1_000_000;

#[program]
pub mod axiom6 {
    use super::*;

    pub fn initialize_registry(
        ctx: Context<InitializeRegistry>,
        protocol_fee_bps: u16,
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.authority = ctx.accounts.authority.key();
        registry.protocol_fee_bps = protocol_fee_bps;
        registry.total_agents = 0;
        registry.total_tvl = 0;
        registry.treasury = ctx.accounts.treasury.key();
        registry.bump = ctx.bumps.registry;
        Ok(())
    }

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        performance_fee_bps: u16,
        whitelisted_mints: Vec<Pubkey>,
    ) -> Result<()> {
        require!(performance_fee_bps <= MAX_PERFORMANCE_FEE_BPS, AxiomError::InvalidPerformanceFee);

        let agent_state = &mut ctx.accounts.agent_state;
        agent_state.developer = ctx.accounts.developer.key();
        agent_state.agent_pubkey = ctx.accounts.agent_pubkey.key();
        agent_state.vault_usdc_ata = ctx.accounts.vault_usdc_ata.key();
        agent_state.performance_fee_bps = performance_fee_bps;
        agent_state.total_shares = 0;
        agent_state.assets_per_share = SHARES_MULTIPLIER;
        agent_state.high_water_mark = SHARES_MULTIPLIER;
        agent_state.cumulative_pnl = 0;
        agent_state.total_trades = 0;

        let clock = Clock::get()?;
        agent_state.epoch_start = clock.unix_timestamp;
        agent_state.epoch_duration = 60;
        agent_state.status = AgentStatus::Active;
        agent_state.whitelisted_mints = whitelisted_mints;
        agent_state.bump = ctx.bumps.agent_state;

        let registry = &mut ctx.accounts.registry;
        registry.total_agents = registry.total_agents
            .checked_add(1)
            .ok_or(AxiomError::MathOverflow)?;
        Ok(())
    }

    pub fn stake_usdc(
        ctx: Context<StakeUsdc>,
        amount: u64,
    ) -> Result<()> {
        let agent_state = &mut ctx.accounts.agent_state;
        require!(agent_state.status == AgentStatus::Active, AxiomError::AgentPaused);

        let shares_to_mint = if agent_state.total_shares == 0 {
            amount
        } else {
            (amount as u128)
                .checked_mul(SHARES_MULTIPLIER as u128)
                .ok_or(AxiomError::MathOverflow)?
                .checked_div(agent_state.assets_per_share as u128)
                .ok_or(AxiomError::MathOverflow)? as u64
        };

        let cpi_accounts = Transfer {
            from: ctx.accounts.staker_usdc_ata.to_account_info(),
            to: ctx.accounts.vault_usdc_ata.to_account_info(),
            authority: ctx.accounts.staker.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
            amount,
        )?;

        agent_state.total_shares = agent_state.total_shares
            .checked_add(shares_to_mint)
            .ok_or(AxiomError::MathOverflow)?;

        let receipt = &mut ctx.accounts.staker_receipt;
        receipt.staker = ctx.accounts.staker.key();
        receipt.agent = agent_state.agent_pubkey;
        receipt.shares = receipt.shares
            .checked_add(shares_to_mint)
            .ok_or(AxiomError::MathOverflow)?;
        receipt.entry_assets_per_share = agent_state.assets_per_share;

        let clock = Clock::get()?;
        receipt.deposit_timestamp = clock.unix_timestamp;
        receipt.bump = ctx.bumps.staker_receipt;

        let registry = &mut ctx.accounts.registry;
        registry.total_tvl = registry.total_tvl
            .checked_add(amount)
            .ok_or(AxiomError::MathOverflow)?;
        Ok(())
    }

    pub fn execute_trade(
        ctx: Context<ExecuteTrade>,
        instruction_data: Vec<u8>,
    ) -> Result<()> {
        let agent_state = &ctx.accounts.agent_state;
        require!(agent_state.status == AgentStatus::Active, AxiomError::AgentPaused);
        require!(
            agent_state.whitelisted_mints.contains(&ctx.accounts.output_mint.key()),
            AxiomError::InvalidOutputMint
        );

        let input_before = ctx.accounts.vault_input_ata.amount;
        let output_before = ctx.accounts.vault_output_ata.amount;

        let account_metas: Vec<AccountMeta> = ctx.remaining_accounts.iter().map(|a| AccountMeta {
            pubkey: *a.key,
            is_signer: a.is_signer,
            is_writable: a.is_writable,
        }).collect();

        let ix = Instruction {
            program_id: JUPITER_PROGRAM_ID,
            accounts: account_metas,
            data: instruction_data,
        };

        let agent_key = agent_state.agent_pubkey;
        let bump = agent_state.bump;
        invoke_signed(&ix, ctx.remaining_accounts, &[&[b"agent", agent_key.as_ref(), &[bump]]])?;

        ctx.accounts.vault_input_ata.reload()?;
        ctx.accounts.vault_output_ata.reload()?;
        let amount_in = input_before.saturating_sub(ctx.accounts.vault_input_ata.amount);
        let amount_out = ctx.accounts.vault_output_ata.amount.saturating_sub(output_before);

        let agent_state_mut = &mut ctx.accounts.agent_state;
        agent_state_mut.total_trades = agent_state_mut.total_trades.saturating_add(1);
        if amount_out > amount_in {
            agent_state_mut.cumulative_pnl = agent_state_mut.cumulative_pnl
                .saturating_add((amount_out - amount_in) as i64);
        } else {
            agent_state_mut.cumulative_pnl = agent_state_mut.cumulative_pnl
                .saturating_sub((amount_in - amount_out) as i64);
        }
        Ok(())
    }

    pub fn settle_epoch(ctx: Context<SettleEpoch>) -> Result<()> {
        let agent_state = &mut ctx.accounts.agent_state;
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp >= agent_state.epoch_start + agent_state.epoch_duration,
            AxiomError::EpochNotFinished
        );

        let mut total_vault_usd: u64 = 0;
        require!(ctx.remaining_accounts.len() % 2 == 0, AxiomError::InvalidRemainingAccounts);
        for i in (0..ctx.remaining_accounts.len()).step_by(2) {
            let ata_data = ctx.remaining_accounts[i].try_borrow_data()?;
            let ata = TokenAccount::try_deserialize(&mut &ata_data[..])?;
            if ata.amount > 0 {
                total_vault_usd = total_vault_usd.checked_add(ata.amount / 1_000_000).unwrap();
            }
        }

        if agent_state.total_shares > 0 {
            let new_aps = (total_vault_usd as u128)
                .checked_mul(SHARES_MULTIPLIER as u128).unwrap()
                .checked_div(agent_state.total_shares as u128).unwrap() as u64;

            if new_aps > agent_state.high_water_mark {
                let profit_per_share = new_aps - agent_state.high_water_mark;
                let total_profit = (profit_per_share as u128)
                    .checked_mul(agent_state.total_shares as u128).unwrap()
                    .checked_div(SHARES_MULTIPLIER as u128).unwrap() as u64;

                let perf_fee = (total_profit as u128 * agent_state.performance_fee_bps as u128 / 10000) as u64;
                let proto_fee = (total_profit as u128 * ctx.accounts.registry.protocol_fee_bps as u128 / 10000) as u64;

                let agent_key = agent_state.agent_pubkey;
                let bump = agent_state.bump;
                let seeds: &[&[&[u8]]] = &[&[b"agent", agent_key.as_ref(), &[bump]]];

                if perf_fee > 0 {
                    token::transfer(CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        Transfer {
                            from: ctx.accounts.vault_usdc_ata.to_account_info(),
                            to: ctx.accounts.developer_usdc_ata.to_account_info(),
                            authority: agent_state.to_account_info(),
                        },
                        seeds,
                    ), perf_fee)?;
                }

                if proto_fee > 0 {
                    token::transfer(CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        Transfer {
                            from: ctx.accounts.vault_usdc_ata.to_account_info(),
                            to: ctx.accounts.treasury_usdc_ata.to_account_info(),
                            authority: agent_state.to_account_info(),
                        },
                        seeds,
                    ), proto_fee)?;
                }

                let net = total_vault_usd.saturating_sub(perf_fee + proto_fee);
                agent_state.assets_per_share = (net as u128 * SHARES_MULTIPLIER as u128
                    / agent_state.total_shares as u128) as u64;
                agent_state.high_water_mark = agent_state.assets_per_share;
            } else {
                agent_state.assets_per_share = new_aps;
            }
        }

        agent_state.epoch_start = clock.unix_timestamp;
        Ok(())
    }

    pub fn unstake(ctx: Context<Unstake>, shares_to_burn: u64) -> Result<()> {
        let agent_state = &mut ctx.accounts.agent_state;
        let receipt = &mut ctx.accounts.staker_receipt;

        require!(receipt.shares >= shares_to_burn, AxiomError::InsufficientShares);
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp >= receipt.deposit_timestamp + 60, // devnet: 60s override
            AxiomError::EpochNotFinished
        );

        let usdc_out = (shares_to_burn as u128 * agent_state.assets_per_share as u128
            / SHARES_MULTIPLIER as u128) as u64;

        receipt.shares = receipt.shares.checked_sub(shares_to_burn).unwrap();
        agent_state.total_shares = agent_state.total_shares.checked_sub(shares_to_burn).unwrap();

        let agent_key = agent_state.agent_pubkey;
        let bump = agent_state.bump;
        token::transfer(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_usdc_ata.to_account_info(),
                to: ctx.accounts.staker_usdc_ata.to_account_info(),
                authority: agent_state.to_account_info(),
            },
            &[&[b"agent", agent_key.as_ref(), &[bump]]],
        ), usdc_out)?;

        let registry = &mut ctx.accounts.registry;
        registry.total_tvl = registry.total_tvl.checked_sub(usdc_out).unwrap();
        Ok(())
    }

    pub fn pause_agent(ctx: Context<PauseAgent>) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.agent_state.developer
                || ctx.accounts.authority.key() == ctx.accounts.registry.authority,
            AxiomError::Unauthorized
        );
        ctx.accounts.agent_state.status = AgentStatus::Paused;
        Ok(())
    }

    pub fn resume_agent(ctx: Context<PauseAgent>) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.agent_state.developer
                || ctx.accounts.authority.key() == ctx.accounts.registry.authority,
            AxiomError::Unauthorized
        );
        ctx.accounts.agent_state.status = AgentStatus::Active;
        Ok(())
    }
}

// ─── Account Contexts ─────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(init, payer = authority, space = Registry::SIZE, seeds = [b"registry"], bump)]
    pub registry: Account<'info, Registry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: Treasury wallet
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(mut, seeds = [b"registry"], bump = registry.bump)]
    pub registry: Account<'info, Registry>,
    #[account(
        init,
        payer = developer,
        space = AgentState::size(5),
        seeds = [b"agent", agent_pubkey.key().as_ref()],
        bump
    )]
    pub agent_state: Account<'info, AgentState>,
    #[account(mut)]
    pub developer: Signer<'info>,
    /// CHECK: Agent hot wallet pubkey
    pub agent_pubkey: AccountInfo<'info>,
    pub vault_usdc_ata: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeUsdc<'info> {
    #[account(mut, seeds = [b"registry"], bump = registry.bump)]
    pub registry: Account<'info, Registry>,
    #[account(mut)]
    pub agent_state: Account<'info, AgentState>,
    #[account(
        init_if_needed,
        payer = staker,
        space = StakerReceipt::SIZE,
        seeds = [b"receipt", agent_state.agent_pubkey.as_ref(), staker.key().as_ref()],
        bump
    )]
    pub staker_receipt: Account<'info, StakerReceipt>,
    #[account(mut)]
    pub staker: Signer<'info>,
    #[account(mut)]
    pub staker_usdc_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_usdc_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteTrade<'info> {
    pub agent: Signer<'info>,
    #[account(mut, seeds = [b"agent", agent.key().as_ref()], bump = agent_state.bump)]
    pub agent_state: Account<'info, AgentState>,
    #[account(mut)]
    pub vault_input_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_output_ata: Account<'info, TokenAccount>,
    pub input_mint: Account<'info, Mint>,
    pub output_mint: Account<'info, Mint>,
    /// CHECK: Pyth price feed
    pub pyth_input_price: AccountInfo<'info>,
    /// CHECK: Pyth price feed
    pub pyth_output_price: AccountInfo<'info>,
    /// CHECK: Jupiter Program
    #[account(address = JUPITER_PROGRAM_ID)]
    pub jupiter_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct SettleEpoch<'info> {
    #[account(mut, seeds = [b"registry"], bump = registry.bump)]
    pub registry: Account<'info, Registry>,
    #[account(mut)]
    pub agent_state: Account<'info, AgentState>,
    #[account(mut)]
    pub vault_usdc_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub developer_usdc_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub treasury_usdc_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut, seeds = [b"registry"], bump = registry.bump)]
    pub registry: Account<'info, Registry>,
    #[account(mut)]
    pub agent_state: Account<'info, AgentState>,
    #[account(
        mut,
        seeds = [b"receipt", agent_state.agent_pubkey.as_ref(), staker.key().as_ref()],
        bump = staker_receipt.bump,
    )]
    pub staker_receipt: Account<'info, StakerReceipt>,
    #[account(mut)]
    pub staker: Signer<'info>,
    #[account(mut)]
    pub staker_usdc_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_usdc_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct PauseAgent<'info> {
    #[account(mut)]
    pub agent_state: Account<'info, AgentState>,
    pub authority: Signer<'info>,
    #[account(seeds = [b"registry"], bump = registry.bump)]
    pub registry: Account<'info, Registry>,
}
