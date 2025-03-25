use crate::instructions::manager::{InitializeInputAccounts, InitializeInputParams};
use crate::states::{AuctionAccount, AuctionRoundAccount, AuctionRoundStatus, AuctionStatus, CreamPadAccount, DecayModelType, ProgramStatus, AUCTION_ACCOUNT_PREFIX, AUCTION_ROUND_ACCOUNT_PREFIX, CREAM_PAD_ACCOUNT_PREFIX};
use crate::utils::{adjust_amount, check_back_authority, check_fee_base_point, check_is_program_working, check_ptmax, check_round_limit, check_signing_authority, check_value_is_zero};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

pub const FIRST_ROUND: &str = "1";

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializePadInputParams {
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

    pub pad_name: String,

    // Bumps
    pub cream_pad_config_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: InitializePadInputParams)]
pub struct InitializePadInputAccounts<'info> {
    #[account(mut)]
    pub fee_and_rent_payer: Signer<'info>,

    pub creator: Signer<'info>,

    pub back_authority: Signer<'info>,

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
        space = AuctionAccount::space(params.tmax),
        seeds = [
        AUCTION_ACCOUNT_PREFIX.as_ref(),
        params.pad_name.as_ref(),
        token_mint_account.key().as_ref(),
        ],
        bump,
    )]
    pub auction_config: Box<Account<'info, AuctionAccount>>,

    #[account(
        init,
        payer = fee_and_rent_payer,
        space = AuctionRoundAccount::space(),
        seeds = [
        AUCTION_ROUND_ACCOUNT_PREFIX.as_ref(),
        auction_config.key().as_ref(),
        FIRST_ROUND.as_ref(),
        ],
        bump,
    )]
    pub auction_round_config: Box<Account<'info, AuctionRoundAccount>>,

    pub token_mint_account: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init,
        payer = fee_and_rent_payer,
        associated_token::mint = token_mint_account,
        associated_token::authority = auction_config,
        associated_token::token_program = token_program,
    )]
    pub auction_config_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = token_mint_account,
        associated_token::authority = creator,
        associated_token::token_program = token_program,
    )]
    pub creator_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,
}

pub fn handle_initialize_pad(
    ctx: Context<InitializePadInputAccounts>,
    params: &InitializePadInputParams,
) -> Result<()> {
    let timestamp = Clock::get().unwrap().unix_timestamp;

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

    check_round_limit(cream_pad_config.round_limit, params.tmax)?;

    check_ptmax(params.p0, params.ptmax)?;

    // Convert amount for transfer
    let adjusted_amount = adjust_amount(params.supply, 9, ctx.accounts.token_mint_account.decimals);


    // Token Transfer
    let cpi_accounts = TransferChecked {
        from: ctx.accounts.creator_token_account.to_account_info(),
        mint: ctx.accounts.token_mint_account.to_account_info(),
        to: ctx.accounts.auction_config_token_account.to_account_info(),
        authority: ctx.accounts.creator.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    transfer_checked(
        cpi_context,
        adjusted_amount,
        ctx.accounts.token_mint_account.decimals,
    )?;

    // Set Values

    let auction_config: &mut Box<Account<AuctionAccount>> = &mut ctx.accounts.auction_config;
    auction_config.last_block_timestamp = timestamp;
    auction_config.creator = ctx.accounts.creator.key();
    auction_config.mint = ctx.accounts.token_mint_account.key();
    auction_config.payment_mint = params.payment_mint;
    auction_config.payment_receiver = params.payment_receiver;
    auction_config.status = AuctionStatus::Started;
    auction_config.p0 = params.p0;
    auction_config.ptmax = params.ptmax;
    auction_config.tmax = params.tmax;
    auction_config.omega = params.omega;
    auction_config.alpha = params.alpha;
    auction_config.time_shift_max = params.time_shift_max;
    auction_config.total_supply = params.supply;
    auction_config.current_price = params.p0;
    auction_config.current_round = 1;
    auction_config.boost_history = Vec::with_capacity(params.tmax as usize);
    auction_config.decay_model = params.decay_model.clone();

    let auction_round_config: &mut Box<Account<AuctionRoundAccount>> = &mut ctx.accounts.auction_round_config;
    auction_round_config.last_block_timestamp = timestamp;
    auction_round_config.round_start_at = timestamp;
    auction_round_config.round_end_at = timestamp.checked_add(params.round_duration).unwrap();
    auction_round_config.round = 1;
    auction_round_config.price = params.p0;
    auction_round_config.boost = 0;

    Ok(())
}
