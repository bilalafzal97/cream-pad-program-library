use crate::states::{
    AuctionAccount, AuctionStatus, CreamPadAccount, AUCTION_ACCOUNT_PREFIX, AUCTION_VAULT_PREFIX,
};
use crate::utils::{
    adjust_amount, check_back_authority, check_can_unlock, check_creator,
    check_is_auction_is_locked, check_is_program_working, check_program_id, check_signer_exist,
    try_get_remaining_account_info,
};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use anchor_lang::solana_program::sysvar::instructions::{
    get_instruction_relative, load_current_index_checked,
};
use crate::events::UnlockUnsoldSupplyEvent;

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UnlockUnsoldSupplyInputParams {
    pub pad_name: String,

    // Bumps
    pub auction_config_bump: u8,

    pub auction_vault_config_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: UnlockUnsoldSupplyInputParams)]
pub struct UnlockUnsoldSupplyInputAccounts<'info> {
    pub creator: Signer<'info>,

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
        associated_token::authority = auction_vault_config,
        associated_token::token_program = token_program,
    )]
    pub auction_vault_config_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = token_mint_account,
        associated_token::authority = creator,
        associated_token::token_program = token_program,
    )]
    pub creator_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    /// CHECK: instructions_sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn handle_unlock_unsold_supply<'info>(
    ctx: Context<'_, '_, 'info, 'info, UnlockUnsoldSupplyInputAccounts<'info>>,
    params: &UnlockUnsoldSupplyInputParams,
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

    check_creator(auction_config.creator, ctx.accounts.creator.key())?;

    check_is_auction_is_locked(auction_config.status.clone())?;

    check_can_unlock(auction_config.unsold_supply_can_unlock_at, timestamp)?;

    let adjusted_lock_supply: u64 = adjust_amount(
        auction_config.total_unsold_supply_locked,
        9,
        ctx.accounts.token_mint_account.decimals,
    );

    // transfer token to user
    let auction_vault_config_bump_bytes = params.auction_vault_config_bump.to_le_bytes();
    let auction_config_key: Pubkey = ctx.accounts.auction_config.key();

    let signer_seeds: &[&[&[u8]]] = &[&[
        AUCTION_VAULT_PREFIX.as_ref(),
        auction_config_key.as_ref(),
        auction_vault_config_bump_bytes.as_ref(),
    ]];

    let transfer_vault_to_creator_cpi_accounts = TransferChecked {
        from: ctx
            .accounts
            .auction_vault_config_token_account
            .to_account_info(),
        mint: ctx.accounts.token_mint_account.to_account_info(),
        to: ctx.accounts.creator_token_account.to_account_info(),
        authority: ctx.accounts.auction_vault_config.to_account_info(),
    };

    let transfer_vault_to_creator_cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info().clone(),
        transfer_vault_to_creator_cpi_accounts,
        signer_seeds,
    );

    transfer_checked(
        transfer_vault_to_creator_cpi_ctx,
        adjusted_lock_supply,
        ctx.accounts.token_mint_account.decimals,
    )?;

    // Set Values
    let auction_config: &mut Box<Account<AuctionAccount>> = &mut ctx.accounts.auction_config;
    auction_config.last_block_timestamp = timestamp;
    auction_config.status = AuctionStatus::UnsoldUnlocked;
    auction_config.unsold_supply_unlocked_at = timestamp;

    // Event
    let event: UnlockUnsoldSupplyEvent = UnlockUnsoldSupplyEvent {
        timestamp,
        mint: ctx.accounts.token_mint_account.key(),
        pad_name: params.pad_name.clone(),
    };

    emit!(event);

    Ok(())
}
