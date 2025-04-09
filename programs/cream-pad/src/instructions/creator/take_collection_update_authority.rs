use crate::events::TakeCollectionUpdateAuthorityEvent;
use crate::states::{
    CollectionAuctionAccount, CreamPadAccount, COLLECTION_AUCTION_ACCOUNT_PREFIX,
    CREAM_PAD_ACCOUNT_PREFIX,
};
use crate::utils::{
    check_back_authority, check_is_program_working, try_get_remaining_account_info,
};
use anchor_lang::prelude::*;
use anchor_spl::metadata::{update_metadata_accounts_v2, Metadata, UpdateMetadataAccountsV2};
use anchor_spl::token_interface::Mint;

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TakeCollectionUpdateAuthorityInputParams {
    pub pad_name: String,

    // Bumps
    pub cream_pad_config_bump: u8,

    pub collection_auction_config_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: TakeCollectionUpdateAuthorityInputParams)]
pub struct TakeCollectionUpdateAuthorityInputAccounts<'info> {
    #[account(mut)]
    pub fee_and_rent_payer: Signer<'info>,

    pub back_authority: Signer<'info>,

    pub current_collection_update_authority: Signer<'info>,

    #[account(
        seeds = [
        CREAM_PAD_ACCOUNT_PREFIX.as_ref(),
        ],
        bump = params.cream_pad_config_bump,
    )]
    pub cream_pad_config: Box<Account<'info, CreamPadAccount>>,

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

    pub token_metadata_program: Program<'info, Metadata>,
}

pub fn handle_take_collection_update_authority<'info>(
    ctx: Context<'_, '_, 'info, 'info, TakeCollectionUpdateAuthorityInputAccounts<'info>>,
    params: &TakeCollectionUpdateAuthorityInputParams,
) -> Result<()> {
    let timestamp = Clock::get().unwrap().unix_timestamp;

    let collection_metadata_account_info =
        try_get_remaining_account_info(ctx.remaining_accounts, 0)?;

    let cream_pad_config: &Box<Account<CreamPadAccount>> = &ctx.accounts.cream_pad_config;

    // Checks
    check_is_program_working(cream_pad_config.program_status.clone())?;

    check_back_authority(
        cream_pad_config.back_authority,
        ctx.accounts.back_authority.key(),
    )?;

    // Update Collection

    let update_collection_cpi_context = CpiContext::new(
        ctx.accounts.token_metadata_program.to_account_info(),
        UpdateMetadataAccountsV2 {
            metadata: collection_metadata_account_info.to_account_info(),
            update_authority: ctx
                .accounts
                .current_collection_update_authority
                .to_account_info(),
        },
    );

    update_metadata_accounts_v2(
        update_collection_cpi_context,
        Some(ctx.accounts.collection_auction_config.key()),
        None,
        None,
        Some(true),
    )?;

    // Set Values

    let collection_auction_config: &mut Box<Account<CollectionAuctionAccount>> =
        &mut ctx.accounts.collection_auction_config;
    collection_auction_config.last_block_timestamp = timestamp;
    collection_auction_config.have_collection_update_authority = true;

    // Event
    let event: TakeCollectionUpdateAuthorityEvent = TakeCollectionUpdateAuthorityEvent {
        timestamp,
        collection_mint: ctx.accounts.collection_mint_account.key(),
        pad_name: params.pad_name.clone(),
    };

    emit!(event);

    Ok(())
}
