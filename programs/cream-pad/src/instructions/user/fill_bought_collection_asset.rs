use crate::events::FillBoughtCollectionAssetEvent;
use crate::states::{
    CollectionAuctionAccount, CreamPadAccount, UserCollectionAuctionAccount,
    UserCollectionAuctionBuyReceiptAccount, COLLECTION_AUCTION_ACCOUNT_PREFIX,
    USER_COLLECTION_AUCTION_ACCOUNT_PREFIX, USER_COLLECTION_AUCTION_BUY_RECEIPT_ACCOUNT_PREFIX,
};
use crate::utils::{
    check_back_authority, check_is_auction_is_locked, check_is_exceeding_end_index,
    check_is_program_working, check_is_receipt_full, check_program_id, check_signer_exist,
    try_get_remaining_account_info,
};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::sysvar::instructions::{
    get_instruction_relative, load_current_index_checked,
};
use anchor_spl::associated_token::{
    create as associated_token_create, AssociatedToken, Create as AssociatedTokenCreate,
};
use anchor_spl::metadata::{
    create_master_edition_v3, create_metadata_accounts_v3,
    mpl_token_metadata::types::{Collection, Creator, DataV2},
    verify_collection, CreateMasterEditionV3, CreateMetadataAccountsV3, Metadata, VerifyCollection,
};
use anchor_spl::token_interface::{mint_to, Mint, MintTo, TokenInterface};

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct FillBoughtCollectionAssetInputParams {
    pub pad_name: String,

    pub asset_uuid: String,

    pub buy_index: String,

    // Bumps
    pub collection_auction_config_bump: u8,

    pub user_collection_auction_config_bump: u8,

    pub user_collection_auction_buy_receipt_config_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: FillBoughtCollectionAssetInputParams)]
pub struct FillBoughtCollectionAssetInputAccounts<'info> {
    #[account(mut)]
    pub fee_and_rent_payer: Signer<'info>,

    /// CHECK: user
    pub user: AccountInfo<'info>,

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

    #[account(
        mut,
        seeds = [
        USER_COLLECTION_AUCTION_ACCOUNT_PREFIX.as_ref(),
        collection_auction_config.key().as_ref(),
        user.key().as_ref(),
        ],
        bump = params.user_collection_auction_config_bump,
    )]
    pub user_collection_auction_config: Box<Account<'info, UserCollectionAuctionAccount>>,

    #[account(
        mut,
        seeds = [
        USER_COLLECTION_AUCTION_BUY_RECEIPT_ACCOUNT_PREFIX.as_ref(),
        user_collection_auction_config.key().as_ref(),
        params.buy_index.as_ref(),
        ],
        bump = params.user_collection_auction_buy_receipt_config_bump,
    )]
    pub user_collection_auction_buy_receipt_config:
        Box<Account<'info, UserCollectionAuctionBuyReceiptAccount>>,

    pub collection_mint_account: Box<InterfaceAccount<'info, Mint>>,

    #[account(
    init,
    payer = fee_and_rent_payer,
    seeds = [
    collection_auction_config.key().as_ref(),
    params.asset_uuid.as_ref()
    ],
    bump,
    mint::decimals = 0,
    mint::authority = collection_auction_config.key(),
    mint::freeze_authority = collection_auction_config.key(),
    mint::token_program = token_program,
    )]
    pub asset_mint_account: Box<InterfaceAccount<'info, Mint>>,

    pub token_program: Interface<'info, TokenInterface>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,

    pub token_metadata_program: Program<'info, Metadata>,

    /// CHECK: instructions_sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

pub fn handle_fill_bought_collection_asset<'info>(
    ctx: Context<'_, '_, 'info, 'info, FillBoughtCollectionAssetInputAccounts<'info>>,
    params: &FillBoughtCollectionAssetInputParams,
) -> Result<()> {
    let timestamp = Clock::get().unwrap().unix_timestamp;

    let collection_auction_config: &Box<Account<CollectionAuctionAccount>> =
        &ctx.accounts.collection_auction_config;

    let user_collection_auction_buy_receipt_config: &Box<
        Account<UserCollectionAuctionBuyReceiptAccount>,
    > = &ctx.accounts.user_collection_auction_buy_receipt_config;

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

    let collection_metadata_account_info =
        try_get_remaining_account_info(ctx.remaining_accounts, 2)?;

    let collection_master_edition_account_info =
        try_get_remaining_account_info(ctx.remaining_accounts, 3)?;

    let user_asset_token_account_account_info =
        try_get_remaining_account_info(ctx.remaining_accounts, 4)?;

    let asset_metadata_account_info = try_get_remaining_account_info(ctx.remaining_accounts, 5)?;

    let asset_master_edition_account_info =
        try_get_remaining_account_info(ctx.remaining_accounts, 6)?;

    check_is_auction_is_locked(collection_auction_config.status.clone())?;

    check_is_exceeding_end_index(
        collection_auction_config
            .current_index
            .checked_add(1)
            .unwrap(),
        collection_auction_config.ending_index,
    )?;

    check_is_receipt_full(
        user_collection_auction_buy_receipt_config
            .buy_amount_filled
            .checked_add(1)
            .unwrap(),
        user_collection_auction_buy_receipt_config.buy_amount,
    )?;

    // asset data

    let asset_id: String = collection_auction_config
        .current_index
        .checked_add(1)
        .unwrap()
        .to_string();

    let mut asset_name: String = collection_auction_config.asset_name.clone();
    asset_name += &(asset_id);

    let mut asset_url = collection_auction_config.asset_url.clone();
    asset_url += &(asset_id);
    asset_url += &(collection_auction_config.asset_url_suffix.clone());

    let mut creators: Option<Vec<Creator>> = None;

    let mut creators_option: Vec<Creator> = Vec::new();

    if collection_auction_config.asset_creators.len() > 0 {
        for creator in &collection_auction_config.asset_creators {
            creators_option.push(Creator {
                verified: false,
                address: creator.address,
                share: creator.share,
            });
        }

        creators = Some(creators_option);
    };

    let data_v2 = DataV2 {
        name: asset_name.clone(),
        symbol: collection_auction_config.asset_symbol.clone(),
        uri: asset_url.clone(),
        seller_fee_basis_points: collection_auction_config.seller_fee_basis_points,
        creators: creators,
        collection: Some(Collection {
            verified: false,
            key: ctx.accounts.collection_mint_account.key(),
        }),
        uses: None,
    };

    // Create treasury asset token account
    let create_treasury_asset_ata_cpi_accounts = AssociatedTokenCreate {
        payer: ctx.accounts.fee_and_rent_payer.to_account_info(),
        associated_token: user_asset_token_account_account_info.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
        mint: ctx.accounts.asset_mint_account.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };

    let create_treasury_asset_ata_cpi_ctx = CpiContext::new(
        ctx.accounts.associated_token_program.to_account_info(),
        create_treasury_asset_ata_cpi_accounts,
    );

    associated_token_create(create_treasury_asset_ata_cpi_ctx)?;

    let collection_auction_config_bump_bytes = params.collection_auction_config_bump.to_le_bytes();
    let collection_mint_account_key = ctx.accounts.collection_mint_account.key();

    let signer_seeds: &[&[&[u8]]] = &[&[
        COLLECTION_AUCTION_ACCOUNT_PREFIX.as_ref(),
        params.pad_name.as_ref(),
        collection_mint_account_key.as_ref(),
        collection_auction_config_bump_bytes.as_ref(),
    ]];

    // create mint account
    let mint_to_cpi_context = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.asset_mint_account.to_account_info(),
            to: user_asset_token_account_account_info.to_account_info(),
            authority: ctx.accounts.collection_auction_config.to_account_info(),
        },
        signer_seeds,
    );

    mint_to(mint_to_cpi_context, 1)?;

    let create_metadata_accounts_v3_cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_metadata_program.to_account_info(),
        CreateMetadataAccountsV3 {
            metadata: asset_metadata_account_info.to_account_info(), // the metadata account being created
            mint: ctx.accounts.asset_mint_account.to_account_info(), // the mint account of the metadata account
            mint_authority: ctx.accounts.collection_auction_config.to_account_info(), // the mint authority of the mint account
            update_authority: ctx.accounts.collection_auction_config.to_account_info(), // the update authority of the metadata account
            payer: ctx.accounts.fee_and_rent_payer.to_account_info(), // the payer for creating the metadata account
            system_program: ctx.accounts.system_program.to_account_info(), // the system program account
            rent: ctx.accounts.rent.to_account_info(), // the rent sysvar account
        },
        signer_seeds,
    );

    create_metadata_accounts_v3(
        create_metadata_accounts_v3_cpi_ctx, // cpi context
        data_v2,                             // token metadata
        true,                                // is_mutable
        true,                                // update_authority_is_signer
        None,                                // collection details
    )?;

    //create master edition account
    let create_master_edition_v3_cpi_context = CpiContext::new_with_signer(
        ctx.accounts.token_metadata_program.to_account_info(),
        CreateMasterEditionV3 {
            edition: asset_master_edition_account_info.to_account_info(),
            mint: ctx.accounts.asset_mint_account.to_account_info(),
            update_authority: ctx.accounts.collection_auction_config.to_account_info(),
            mint_authority: ctx.accounts.collection_auction_config.to_account_info(),
            payer: ctx.accounts.fee_and_rent_payer.to_account_info(),
            metadata: asset_metadata_account_info.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        },
        signer_seeds,
    );

    create_master_edition_v3(create_master_edition_v3_cpi_context, Some(0))?;

    //verify collection
    let verify_collection_cpi_context = CpiContext::new_with_signer(
        ctx.accounts.token_metadata_program.to_account_info(),
        VerifyCollection {
            payer: ctx.accounts.fee_and_rent_payer.to_account_info(),
            metadata: asset_metadata_account_info.to_account_info(),
            collection_authority: ctx.accounts.collection_auction_config.to_account_info(),
            collection_mint: ctx.accounts.collection_mint_account.to_account_info(),
            collection_metadata: collection_metadata_account_info.to_account_info(),
            collection_master_edition: collection_master_edition_account_info.to_account_info(),
        },
        signer_seeds,
    );

    verify_collection(verify_collection_cpi_context, None)?;

    // Set Values

    let collection_auction_config: &mut Box<Account<CollectionAuctionAccount>> =
        &mut ctx.accounts.collection_auction_config;
    collection_auction_config.last_block_timestamp = timestamp;
    collection_auction_config.current_index = collection_auction_config
        .current_index
        .checked_add(1)
        .unwrap();
    collection_auction_config.total_supply_sold_filled = collection_auction_config
        .total_supply_sold_filled
        .checked_add(1)
        .unwrap();

    let user_collection_auction_config: &mut Box<Account<UserCollectionAuctionAccount>> =
        &mut ctx.accounts.user_collection_auction_config;
    user_collection_auction_config.last_block_timestamp = timestamp;

    user_collection_auction_config.total_buy_amount_filled = user_collection_auction_config
        .total_buy_amount_filled
        .checked_add(1)
        .unwrap();

    let user_collection_auction_buy_receipt_config: &mut Box<
        Account<UserCollectionAuctionBuyReceiptAccount>,
    > = &mut ctx.accounts.user_collection_auction_buy_receipt_config;
    user_collection_auction_buy_receipt_config.last_block_timestamp = timestamp;

    user_collection_auction_buy_receipt_config.buy_amount_filled =
        user_collection_auction_buy_receipt_config
            .buy_amount_filled
            .checked_add(1)
            .unwrap();

    // Event
    let event: FillBoughtCollectionAssetEvent = FillBoughtCollectionAssetEvent {
        timestamp,
        collection_mint: ctx.accounts.collection_mint_account.key(),
        pad_name: params.pad_name.clone(),
        asset_uuid: params.asset_uuid.clone(),
        asset_index: collection_auction_config.current_index,
        buy_index: params.buy_index.clone().parse().unwrap(),
        user: ctx.accounts.user.key(),
    };

    emit!(event);

    Ok(())
}
