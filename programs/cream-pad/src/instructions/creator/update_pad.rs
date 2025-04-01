use crate::states::{AuctionAccount, CreamPadAccount, AUCTION_ACCOUNT_PREFIX};
use crate::utils::{
    check_back_authority, check_is_program_working, check_program_id, check_signer_exist,
    try_get_remaining_account_info,
};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_spl::token_interface::Mint;

use anchor_lang::solana_program::sysvar::instructions::{
    get_instruction_relative, load_current_index_checked,
};

use crate::events::UpdatePadEvent;

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdatePadInputParams {
    pub payment_receiver: Pubkey,

    pub pad_name: String,

    // Bumps
    pub auction_config_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: UpdatePadInputParams)]
pub struct UpdatePadInputAccounts<'info> {
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

    pub token_mint_account: Box<InterfaceAccount<'info, Mint>>,

    /// CHECK: instructions_sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn handle_update_pad<'info>(
    ctx: Context<'_, '_, 'info, 'info, UpdatePadInputAccounts<'info>>,
    params: &UpdatePadInputParams,
) -> Result<()> {
    let timestamp = Clock::get().unwrap().unix_timestamp;

    let cream_pad_config_account_info = try_get_remaining_account_info(ctx.remaining_accounts, 0)?;

    let cream_pad_config: Account<CreamPadAccount> =
        Account::try_from(cream_pad_config_account_info)?;
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

    // Set Values
    let auction_config: &mut Box<Account<AuctionAccount>> = &mut ctx.accounts.auction_config;
    auction_config.last_block_timestamp = timestamp;
    auction_config.payment_receiver = params.payment_receiver;

    // Event
    let event: UpdatePadEvent = UpdatePadEvent {
        timestamp,
        mint: ctx.accounts.token_mint_account.key(),
        pad_name: params.pad_name.clone(),
        payment_receiver: params.payment_receiver.key(),
    };

    emit!(event);

    Ok(())
}
