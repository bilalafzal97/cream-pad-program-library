use crate::events::GiveCollectionUpdateAuthorityEvent;
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
pub struct GiveCollectionUpdateAuthorityInputParams {
    pub pad_name: String,

    // Bumps
    pub cream_pad_config_bump: u8,

    pub collection_auction_config_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: GiveCollectionUpdateAuthorityInputParams)]
pub struct GiveCollectionUpdateAuthorityInputAccounts<'info> {
    pub back_authority: Signer<'info>,

    /// CHECK: new_collection_update_authority
    pub new_collection_update_authority: AccountInfo<'info>,

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

pub fn handle_give_collection_update_authority<'info>(
    ctx: Context<'_, '_, 'info, 'info, GiveCollectionUpdateAuthorityInputAccounts<'info>>,
    params: &GiveCollectionUpdateAuthorityInputParams,
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

    let collection_auction_config_bump_bytes = params.collection_auction_config_bump.to_le_bytes();
    let collection_mint_account_key = ctx.accounts.collection_mint_account.key();

    let signer_seeds: &[&[&[u8]]] = &[&[
        COLLECTION_AUCTION_ACCOUNT_PREFIX.as_ref(),
        params.pad_name.as_ref(),
        collection_mint_account_key.as_ref(),
        collection_auction_config_bump_bytes.as_ref(),
    ]];

    let update_collection_cpi_context = CpiContext::new_with_signer(
        ctx.accounts.token_metadata_program.to_account_info(),
        UpdateMetadataAccountsV2 {
            metadata: collection_metadata_account_info.to_account_info(),
            update_authority: ctx.accounts.collection_auction_config.to_account_info(),
        },
        signer_seeds,
    );

    update_metadata_accounts_v2(
        update_collection_cpi_context,
        Some(ctx.accounts.new_collection_update_authority.key()),
        None,
        None,
        Some(true),
    )?;

    // Set Values

    let collection_auction_config: &mut Box<Account<CollectionAuctionAccount>> =
        &mut ctx.accounts.collection_auction_config;
    collection_auction_config.last_block_timestamp = timestamp;
    collection_auction_config.have_collection_update_authority = false;

    // Event
    let event: GiveCollectionUpdateAuthorityEvent = GiveCollectionUpdateAuthorityEvent {
        timestamp,
        collection_mint: ctx.accounts.collection_mint_account.key(),
        pad_name: params.pad_name.clone(),
        new_collection_update_authority: ctx.accounts.new_collection_update_authority.key(),
    };

    emit!(event);

    Ok(())
}
