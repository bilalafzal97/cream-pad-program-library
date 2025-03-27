use crate::states::{
    AuctionAccount, AuctionStatus, CreamPadAccount, AUCTION_ACCOUNT_PREFIX, AUCTION_VAULT_PREFIX
};
use crate::utils::{adjust_amount, check_back_authority, check_is_auction_ended, check_is_program_working, check_program_id, check_signer_exist, check_supply_locker, try_get_remaining_account_info, BASE_POINT};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use anchor_lang::solana_program::sysvar::instructions::{
    get_instruction_relative, load_current_index_checked,
};

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LockAndDistributeInputParams {
    pub pad_name: String,

    // Bumps
    pub auction_config_bump: u8,

    pub auction_vault_config_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: LockAndDistributeInputParams)]
pub struct LockAndDistributeInputAccounts<'info> {
    #[account(mut)]
    pub fee_and_rent_payer: Signer<'info>,

    pub supply_locker: Signer<'info>,

    #[account(
        mut,
        seeds = [
        AUCTION_ACCOUNT_PREFIX.as_ref(),
        params.pad_name.as_ref(),
        token_mint_account.key().as_ref(),
        ],
        bump = params.auction_config_bump,
    )]
    pub auction_config: Box<Account<'info, AuctionAccount>>,


    /// CHECK: auction_vault_config
    #[account(
        seeds = [
        AUCTION_VAULT_PREFIX.as_ref(),
        auction_config.key().as_ref(),
        ],
   bump = params.auction_vault_config_bump,
    )]
    pub auction_vault_config: AccountInfo<'info>,

    pub token_mint_account: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = token_mint_account,
        associated_token::authority = auction_config,
        associated_token::token_program = token_program,
    )]
    pub auction_config_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        init,
        payer = fee_and_rent_payer,
        associated_token::mint = token_mint_account,
        associated_token::authority = auction_vault_config,
        associated_token::token_program = token_program,
    )]
    pub auction_vault_config_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,

    /// CHECK: instructions_sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn handle_lock_and_distribute<'info>(
    ctx: Context<'_, '_, 'info, 'info, LockAndDistributeInputAccounts<'info>>,
    params: &LockAndDistributeInputParams,
) -> Result<()> {
    let timestamp = Clock::get().unwrap().unix_timestamp;

    let cream_pad_config_account_info = try_get_remaining_account_info(ctx.remaining_accounts, 0)?;

    let cream_pad_config: Account<CreamPadAccount> =
        Account::try_from(cream_pad_config_account_info)?;

    let auction_config: &Box<Account<AuctionAccount>> = &ctx.accounts.auction_config;

    // Checks
    check_program_id(
        cream_pad_config_account_info.owner.key(),
        ctx.program_id.key(),
    )?;

    check_is_program_working(cream_pad_config.program_status.clone())?;

    if cream_pad_config.is_back_authority_required {
        let back_authority_account_info =
            try_get_remaining_account_info(ctx.remaining_accounts, 1)?;

        check_back_authority(
            cream_pad_config.back_authority,
            back_authority_account_info.key(),
        )?;

        let instruction_index =
            load_current_index_checked(&ctx.accounts.instructions_sysvar.to_account_info())?
                as usize;
        let instruction: Instruction =
            get_instruction_relative(instruction_index as i64, &ctx.accounts.instructions_sysvar)?;

        check_signer_exist(instruction, back_authority_account_info.key())?;
    };

    check_supply_locker(auction_config.creator, cream_pad_config.back_authority, ctx.accounts.supply_locker.key())?;

    check_is_auction_ended(auction_config.status.clone())?;

    let adjusted_unsold_supply: u64 = adjust_amount(auction_config.total_supply.checked_sub(auction_config.total_supply_sold).unwrap(), 9, ctx.accounts.token_mint_account.decimals);

    let unsold_supply_for_lock: u64 = adjusted_unsold_supply.checked_mul(cream_pad_config.lock_base_point as u64).unwrap().checked_div(BASE_POINT as u64).unwrap();
    let unsold_supply_for_distribution: u64 = adjusted_unsold_supply.checked_mul(cream_pad_config.distribution_base_point as u64).unwrap().checked_div(BASE_POINT as u64).unwrap();

    // transfer token to user
    let auction_config_bump_bytes = params.auction_config_bump.to_le_bytes();
    let token_mint_account_key = ctx.accounts.token_mint_account.key();

    let signer_seeds: &[&[&[u8]]] = &[&[
        AUCTION_ACCOUNT_PREFIX.as_ref(),
        params.pad_name.as_ref(),
        token_mint_account_key.as_ref(),
        auction_config_bump_bytes.as_ref(),
    ]];

    let transfer_token_to_vault_cpi_accounts = TransferChecked {
        from: ctx.accounts.auction_config_token_account.to_account_info(),
        mint: ctx.accounts.token_mint_account.to_account_info(),
        to: ctx.accounts.auction_vault_config_token_account.to_account_info(),
        authority: ctx.accounts.auction_config.to_account_info(),
    };

    let transfer_token_to_vault_cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info().clone(),
        transfer_token_to_vault_cpi_accounts,
        signer_seeds,
    );

    transfer_checked(
        transfer_token_to_vault_cpi_ctx,
        unsold_supply_for_lock,
        ctx.accounts.token_mint_account.decimals,
    )?;

    let adjusted_back_unsold_supply_for_lock: u64 = adjust_amount(unsold_supply_for_lock, ctx.accounts.token_mint_account.decimals, 9);
    let adjusted_back_unsold_supply_for_distribution: u64 = adjust_amount(unsold_supply_for_distribution, ctx.accounts.token_mint_account.decimals, 9);

    // Set Values
    let auction_config: &mut Box<Account<AuctionAccount>> = &mut ctx.accounts.auction_config;
    auction_config.last_block_timestamp = timestamp;
    auction_config.status = AuctionStatus::UnSoldLockedAndDistributionOpen;
    auction_config.total_unsold_supply_distribution = adjusted_back_unsold_supply_for_distribution;
    auction_config.total_unsold_supply_locked = adjusted_back_unsold_supply_for_lock;
    auction_config.unsold_supply_locked_at = timestamp;
    auction_config.unsold_supply_can_unlock_at = timestamp.checked_add(cream_pad_config.lock_duration).unwrap();

    Ok(())
}
