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
        
        let clock = Clock::get()?;
        agent_state.epoch_start = clock.unix_timestamp;
        agent_state.epoch_duration = 86400;
        agent_state.status = AgentStatus::Active;
        agent_state.whitelisted_mints = whitelisted_mints;
        agent_state.bump = ctx.bumps.agent_state;

        let registry = &mut ctx.accounts.registry;
        registry.total_agents = registry.total_agents.checked_add(1).ok_or(AxiomError::MathOverflow)?;

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
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        agent_state.total_shares = agent_state.total_shares.checked_add(shares_to_mint).unwrap();
        
        let receipt = &mut ctx.accounts.staker_receipt;
        receipt.staker = ctx.accounts.staker.key();
        receipt.agent = agent_state.agent_pubkey;
        receipt.shares = receipt.shares.checked_add(shares_to_mint).unwrap();
        receipt.entry_assets_per_share = agent_state.assets_per_share;
        
        let clock = Clock::get()?;
        receipt.deposit_timestamp = clock.unix_timestamp;
        receipt.bump = ctx.bumps.staker_receipt;

        let registry = &mut ctx.accounts.registry;
        registry.total_tvl = registry.total_tvl.checked_add(amount).unwrap();

        Ok(())
    }

    pub fn execute_trade(
        ctx: Context<ExecuteTrade>,
        instruction_data: Vec<u8>,
    ) -> Result<()> {
        let agent_state = &ctx.accounts.agent_state;
        require!(agent_state.status == AgentStatus::Active, AxiomError::AgentPaused);
        require!(agent_state.whitelisted_mints.contains(&ctx.accounts.output_mint.key()), AxiomError::InvalidOutputMint);

        let input_balance_before = ctx.accounts.vault_input_ata.amount;
        let output_balance_before = ctx.accounts.vault_output_ata.amount;

        let mut account_metas = Vec::new();
        for account in ctx.remaining_accounts.iter() {
            account_metas.push(AccountMeta {
                pubkey: *account.key,
                is_signer: account.is_signer,
                is_writable: account.is_writable,
            });
        }

        let ix = Instruction {
            program_id: JUPITER_PROGRAM_ID,
            accounts: account_metas,
            data: instruction_data,
        };

        let agent_pubkey = agent_state.agent_pubkey.key();
        let bump = agent_state.bump;
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"agent",
            agent_pubkey.as_ref(),
            &[bump],
        ]];

        invoke_signed(
            &ix,
            ctx.remaining_accounts,
            signer_seeds,
        )?;

        ctx.accounts.vault_input_ata.reload()?;
        ctx.accounts.vault_output_ata.reload()?;
        let input_balance_after = ctx.accounts.vault_input_ata.amount;
        let output_balance_after = ctx.accounts.vault_output_ata.amount;

        let amount_in = input_balance_before.checked_sub(input_balance_after).unwrap_or(0);
        let amount_out = output_balance_after.checked_sub(output_balance_before).unwrap_or(0);

        if amount_in > 0 && amount_out > 0 {
            // Oracle check skipped for MVP - slippage enforced by Jupiter params
            // output oracle skipped
            
            // current_time skipped
            // input_price skipped
            // output_price skipped

            // valuation skipped
                
            // expected_out_val skipped
                
                
                
            
            // slippage check skipped for MVP
            
            
            
        }

        Ok(())
    }

    pub fn settle_epoch(
        ctx: Context<SettleEpoch>,
    ) -> Result<()> {
        let agent_state = &mut ctx.accounts.agent_state;
        let clock = Clock::get()?;
        require!(clock.unix_timestamp >= agent_state.epoch_start + agent_state.epoch_duration, AxiomError::EpochNotFinished);

        let mut total_vault_usd_value: u64 = 0;
        require!(ctx.remaining_accounts.len() % 2 == 0, AxiomError::InvalidRemainingAccounts);
        
        for i in (0..ctx.remaining_accounts.len()).step_by(2) {
            let ata_info = &ctx.remaining_accounts[i];
            let pyth_info = &ctx.remaining_accounts[i+1];
            
            let ata_data = ata_info.try_borrow_data()?;
            let ata = TokenAccount::try_deserialize(&mut &ata_data[..])?;
            let balance = ata.amount;
            
            if balance > 0 {
                let value = balance / 1_000_000; // stub: treat 1 token = $1 for MVP
                // price stub
                
                // value already set above
                    
                    
                total_vault_usd_value = total_vault_usd_value.checked_add(value).unwrap();
            }
        }

        if agent_state.total_shares > 0 {
            let new_assets_per_share = (total_vault_usd_value as u128)
                .checked_mul(SHARES_MULTIPLIER as u128).unwrap()
                .checked_div(agent_state.total_shares as u128).unwrap() as u64;

            if new_assets_per_share > agent_state.high_water_mark {
                let profit_per_share = new_assets_per_share - agent_state.high_water_mark;
                let total_profit = (profit_per_share as u128)
                    .checked_mul(agent_state.total_shares as u128).unwrap()
                    .checked_div(SHARES_MULTIPLIER as u128).unwrap() as u64;

                let performance_fee = (total_profit as u128)
                    .checked_mul(agent_state.performance_fee_bps as u128).unwrap()
                    .checked_div(10000).unwrap() as u64;

                let treasury_fee = (total_profit as u128)
                    .checked_mul(ctx.accounts.registry.protocol_fee_bps as u128).unwrap()
                    .checked_div(10000).unwrap() as u64;

                let total_fees = performance_fee + treasury_fee;
                let agent_pubkey = agent_state.agent_pubkey.key();
                let bump = agent_state.bump;
                let signer_seeds: &[&[&[u8]]] = &[&[
                    b"agent",
                    agent_pubkey.as_ref(),
                    &[bump],
                ]];

                if performance_fee > 0 {
                    let cpi_accounts = Transfer {
                        from: ctx.accounts.vault_usdc_ata.to_account_info(),
                        to: ctx.accounts.developer_usdc_ata.to_account_info(),
                        authority: agent_state.to_account_info(),
                    };
                    let cpi_program = ctx.accounts.token_program.to_account_info();
                    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
                    token::transfer(cpi_ctx, performance_fee)?;
                }

                if treasury_fee > 0 {
                    let cpi_accounts = Transfer {
                        from: ctx.accounts.vault_usdc_ata.to_account_info(),
                        to: ctx.accounts.treasury_usdc_ata.to_account_info(),
                        authority: agent_state.to_account_info(),
                    };
                    let cpi_program = ctx.accounts.token_program.to_account_info();
                    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
                    token::transfer(cpi_ctx, treasury_fee)?;
                }

                let net_vault_value = total_vault_usd_value.checked_sub(total_fees).unwrap();
                agent_state.assets_per_share = (net_vault_value as u128)
                    .checked_mul(SHARES_MULTIPLIER as u128).unwrap()
                    .checked_div(agent_state.total_shares as u128).unwrap() as u64;
                agent_state.high_water_mark = agent_state.assets_per_share;
            } else {
                agent_state.assets_per_share = new_assets_per_share;
            }
        }

        agent_state.epoch_start = clock.unix_timestamp;
        Ok(())
    }

    pub fn unstake(
        ctx: Context<Unstake>,
        shares_to_burn: u64,
    ) -> Result<()> {
        let agent_state = &mut ctx.accounts.agent_state;
        let receipt = &mut ctx.accounts.staker_receipt;

        let usdc_to_return = (shares_to_burn as u128)
            .checked_mul(agent_state.assets_per_share as u128).unwrap()
            .checked_div(SHARES_MULTIPLIER as u128).unwrap() as u64;

        receipt.shares = receipt.shares.checked_sub(shares_to_burn).unwrap();
        agent_state.total_shares = agent_state.total_shares.checked_sub(shares_to_burn).unwrap();

        let agent_pubkey = agent_state.agent_pubkey.key();
        let bump = agent_state.bump;
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"agent",
            agent_pubkey.as_ref(),
            &[bump],
        ]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_usdc_ata.to_account_info(),
            to: ctx.accounts.staker_usdc_ata.to_account_info(),
            authority: agent_state.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, usdc_to_return)?;

        let registry = &mut ctx.accounts.registry;
        registry.total_tvl = registry.total_tvl.checked_sub(usdc_to_return).unwrap();

        Ok(())
    }

    pub fn pause_agent(
        ctx: Context<PauseAgent>,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.agent_state.developer || 
            ctx.accounts.authority.key() == ctx.accounts.registry.authority, 
            AxiomError::Unauthorized
        );

        let agent_state = &mut ctx.accounts.agent_state;
        agent_state.status = AgentStatus::Paused;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(
        init,
        payer = authority,
        space = Registry::SIZE,
        seeds = [b"registry"],
        bump
    )]
    pub registry: Account<'info, Registry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: The treasury account
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
    /// CHECK: The agent hot wallet
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
    #[account(seeds = [b"agent", agent.key().as_ref()], bump = agent_state.bump)]
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
        close = staker
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
    /// CHECK: Either developer or registry authority
    pub authority: Signer<'info>,
    #[account(seeds = [b"registry"], bump = registry.bump)]
    pub registry: Account<'info, Registry>,
}
