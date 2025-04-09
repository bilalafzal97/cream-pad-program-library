use crate::states::{CollectionAuctionAccount, CreamPadAccount, COLLECTION_AUCTION_ACCOUNT_PREFIX};
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

use crate::events::UpdateCollectionPadEvent;

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateCollectionPadInputParams {
    pub payment_receiver: Pubkey,

    pub pad_name: String,

    // Bumps
    pub collection_auction_config_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: UpdateCollectionPadInputParams)]
pub struct UpdateCollectionPadInputAccounts<'info> {
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [
        COLLECTION_AUCTION_ACCOUNT_PREFIX.as_ref(),
        params.pad_name.as_ref(),
        collection_mint_account.key().as_ref(),
        ],
        bump = params.collection_auction_config_bump,
    )]
    pub collection_auction_config: Box<Account<'info, CollectionAuctionAccount>>,

    pub collection_mint_account: Box<InterfaceAccount<'info, Mint>>,

    /// CHECK: instructions_sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn handle_update_collection_pad<'info>(
    ctx: Context<'_, '_, 'info, 'info, UpdateCollectionPadInputAccounts<'info>>,
    params: &UpdateCollectionPadInputParams,
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
    let collection_auction_config: &mut Box<Account<CollectionAuctionAccount>> =
        &mut ctx.accounts.collection_auction_config;
    collection_auction_config.last_block_timestamp = timestamp;
    collection_auction_config.payment_receiver = params.payment_receiver;

    // Event
    let event: UpdateCollectionPadEvent = UpdateCollectionPadEvent {
        timestamp,
        collection_mint: ctx.accounts.collection_mint_account.key(),
        pad_name: params.pad_name.clone(),
        payment_receiver: params.payment_receiver.key(),
    };

    emit!(event);

    Ok(())
}
