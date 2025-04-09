use crate::events::InitializeCollectionPadEvent;
use crate::states::{
    AssetCreator, AuctionStatus, CollectionAuctionAccount,
    CollectionAuctionRoundAccount, CreamPadAccount, DecayModelType, COLLECTION_AUCTION_ACCOUNT_PREFIX,
    COLLECTION_AUCTION_ROUND_ACCOUNT_PREFIX, CREAM_PAD_ACCOUNT_PREFIX,
};
use crate::utils::{check_back_authority, check_creators_share, check_is_program_working, check_ptmax, check_round_limit, check_seller_fee_basis_points, check_supply_evenly_divisible, check_unique_creators, check_value_is_zero, try_get_remaining_account_info};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::metadata::{
    update_metadata_accounts_v2, Metadata, UpdateMetadataAccountsV2,
};
use anchor_spl::token_interface::{
    Mint, TokenInterface,
};

pub const FIRST_ROUND: &str = "1";

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeCollectionPadInputParams {
    pub payment_mint: Pubkey,

    pub payment_receiver: Pubkey,

    pub p0: u64,

    pub ptmax: u64,

    pub tmax: u16,

    pub omega: u64,

    pub alpha: u64,

    pub time_shift_max: u64,

    pub round_duration: i64,

    pub supply: u64,

    pub decay_model: DecayModelType,

    pub starting_index: u64,

    pub have_buy_limit: bool,

    pub buy_limit: u64,

    pub seller_fee_basis_points: u16,

    pub asset_creators: Vec<AssetCreator>,

    pub asset_name: String,

    pub asset_symbol: String,

    pub asset_url: String,

    pub asset_url_suffix: String,

    pub pad_name: String,

    // Bumps
    pub cream_pad_config_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: InitializeCollectionPadInputParams)]
pub struct InitializeCollectionPadInputAccounts<'info> {
    #[account(mut)]
    pub fee_and_rent_payer: Signer<'info>,

    pub creator: Signer<'info>,

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
        init,
        payer = fee_and_rent_payer,
        space = CollectionAuctionAccount::space(params.tmax, params.asset_creators.len()),
        seeds = [
        COLLECTION_AUCTION_ACCOUNT_PREFIX.as_ref(),
        params.pad_name.as_ref(),
        collection_mint_account.key().as_ref(),
        ],
        bump,
    )]
    pub collection_auction_config: Box<Account<'info, CollectionAuctionAccount>>,

    #[account(
        init,
        payer = fee_and_rent_payer,
        space = CollectionAuctionRoundAccount::space(),
        seeds = [
        COLLECTION_AUCTION_ROUND_ACCOUNT_PREFIX.as_ref(),
        collection_auction_config.key().as_ref(),
        FIRST_ROUND.as_ref(),
        ],
        bump,
    )]
    pub collection_auction_round_config: Box<Account<'info, CollectionAuctionRoundAccount>>,

    pub collection_mint_account: Box<InterfaceAccount<'info, Mint>>,

    pub token_program: Interface<'info, TokenInterface>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,

    pub token_metadata_program: Program<'info, Metadata>,
}

pub fn handle_initialize_collection_pad<'info>(
    ctx: Context<'_, '_, 'info, 'info, InitializeCollectionPadInputAccounts<'info>>,
    params: &InitializeCollectionPadInputParams,
) -> Result<()> {
    let timestamp = Clock::get().unwrap().unix_timestamp;

    let collection_metadata_account_info = try_get_remaining_account_info(ctx.remaining_accounts, 0)?;

    let cream_pad_config: &Box<Account<CreamPadAccount>> = &ctx.accounts.cream_pad_config;

    // Checks

    check_is_program_working(cream_pad_config.program_status.clone())?;

    check_back_authority(
        cream_pad_config.back_authority,
        ctx.accounts.back_authority.key(),
    )?;

    check_value_is_zero(params.p0 as usize)?;
    check_value_is_zero(params.ptmax as usize)?;
    check_value_is_zero(params.tmax as usize)?;
    check_value_is_zero(params.omega as usize)?;
    check_value_is_zero(params.alpha as usize)?;
    check_value_is_zero(params.time_shift_max as usize)?;
    check_value_is_zero(params.round_duration as usize)?;
    check_value_is_zero(params.supply as usize)?;

    check_supply_evenly_divisible(params.supply, params.tmax as u64)?;

    if params.have_buy_limit {
        check_value_is_zero(params.buy_limit as usize)?;
    };

    check_round_limit(cream_pad_config.round_limit, params.tmax)?;

    check_ptmax(params.p0, params.ptmax)?;

    if !params.asset_creators.is_empty() {
        check_unique_creators(&params.asset_creators)?;

        check_creators_share(params.asset_creators.iter().map(|c| c.share).sum())?;
    };

    check_seller_fee_basis_points(params.seller_fee_basis_points)?;

    // Update Collection

    let update_collection_cpi_context = CpiContext::new(
        ctx.accounts.token_metadata_program.to_account_info(),
        UpdateMetadataAccountsV2 {
            metadata: collection_metadata_account_info.to_account_info(),
            update_authority: ctx.accounts.current_collection_update_authority.to_account_info(),
        }
    );

    update_metadata_accounts_v2(
        update_collection_cpi_context,
        Some(ctx.accounts.collection_auction_config.key()),
        None,
        None,
        Some(true)
    )?;

    // Set Values

    let collection_auction_config: &mut Box<Account<CollectionAuctionAccount>> = &mut ctx.accounts.collection_auction_config;
    collection_auction_config.last_block_timestamp = timestamp;
    collection_auction_config.creator = ctx.accounts.creator.key();
    collection_auction_config.collection_mint = ctx.accounts.collection_mint_account.key();
    collection_auction_config.payment_mint = params.payment_mint;
    collection_auction_config.payment_receiver = params.payment_receiver;
    collection_auction_config.status = AuctionStatus::Started;
    collection_auction_config.p0 = params.p0;
    collection_auction_config.ptmax = params.ptmax;
    collection_auction_config.tmax = params.tmax;
    collection_auction_config.omega = params.omega;
    collection_auction_config.alpha = params.alpha;
    collection_auction_config.time_shift_max = params.time_shift_max;
    collection_auction_config.total_supply = params.supply;
    collection_auction_config.current_price = params.p0;
    collection_auction_config.current_round = 1;
    collection_auction_config.boost_history = Vec::with_capacity(params.tmax as usize);
    collection_auction_config.decay_model = params.decay_model.clone();
    collection_auction_config.seller_fee_basis_points = params.seller_fee_basis_points;
    collection_auction_config.asset_creators = params.asset_creators.clone();
    collection_auction_config.starting_index = params.starting_index;
    collection_auction_config.ending_index = params.starting_index.checked_add(params.supply).unwrap();
    collection_auction_config.current_index = params.starting_index;
    collection_auction_config.asset_name = params.asset_name.clone();
    collection_auction_config.asset_symbol = params.asset_symbol.clone();
    collection_auction_config.asset_url = params.asset_url.clone();
    collection_auction_config.asset_url_suffix = params.asset_url_suffix.clone();
    collection_auction_config.have_collection_update_authority = true;

    let collection_auction_round_config: &mut Box<Account<CollectionAuctionRoundAccount>> = &mut ctx.accounts.collection_auction_round_config;
    collection_auction_round_config.last_block_timestamp = timestamp;
    collection_auction_round_config.round_start_at = timestamp;
    collection_auction_round_config.round_end_at = timestamp.checked_add(params.round_duration).unwrap();
    collection_auction_round_config.round = 1;
    collection_auction_round_config.price = params.p0;
    collection_auction_round_config.boost = 0;
    collection_auction_round_config.have_buy_limit = params.have_buy_limit;
    collection_auction_round_config.buy_limit = params.buy_limit;

    // // Event
    let event: InitializeCollectionPadEvent = InitializeCollectionPadEvent {
        timestamp,
        creator: ctx.accounts.creator.key(),
        collection_mint: ctx.accounts.collection_mint_account.key(),
        pad_name: params.pad_name.clone(),
        payment_receiver: params.payment_receiver.key(),
        round_duration: params.round_duration,
        p0: params.p0,
        ptmax: params.ptmax,
        tmax: params.tmax,
        omega: params.omega,
        alpha: params.alpha,
        time_shift_max: params.time_shift_max,
        have_buy_limit: params.have_buy_limit,
        buy_limit: params.buy_limit,
        starting_index: collection_auction_config.starting_index,
        ending_index: collection_auction_config.ending_index,
        seller_fee_basis_points: collection_auction_config.seller_fee_basis_points,
        asset_creators: collection_auction_config.asset_creators.clone(),
    };

    emit!(event);

    Ok(())
}
