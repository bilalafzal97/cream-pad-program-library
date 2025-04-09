use crate::error::CreamPadError;
use crate::states::{
    AssetCreator, AuctionRoundStatus, AuctionStatus, DecayModelType, ProgramStatus,
};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction;
use std::collections::HashSet;

pub const BASE_POINT: u16 = 10000;

pub fn check_signing_authority(
    signing_authority_from_account: Pubkey,
    signing_authority_from_input_accounts: Pubkey,
) -> Result<()> {
    if signing_authority_from_account != signing_authority_from_input_accounts {
        return Err(CreamPadError::InvalidSigningAuthority.into());
    }

    Ok(())
}

pub fn check_back_authority(
    back_authority_from_account: Pubkey,
    back_authority_from_input_accounts: Pubkey,
) -> Result<()> {
    if back_authority_from_account != back_authority_from_input_accounts {
        return Err(CreamPadError::InvalidBackAuthority.into());
    }

    Ok(())
}
pub fn check_value_is_zero(value: usize) -> Result<()> {
    if value <= 0 {
        return Err(CreamPadError::ValueIsZero.into());
    }

    Ok(())
}

pub fn check_program_id(from_account: Pubkey, from_context: Pubkey) -> Result<()> {
    if from_account != from_context {
        return Err(CreamPadError::InvalidProgram.into());
    }

    Ok(())
}

pub fn check_fee_base_point(value: u16) -> Result<()> {
    if value >= BASE_POINT {
        return Err(CreamPadError::InvalidFeeBasePoint.into());
    }

    Ok(())
}

pub fn check_distribution_and_lock_base_point(value: u16) -> Result<()> {
    if value > BASE_POINT {
        return Err(CreamPadError::InvalidDistributionAndLockBasePoint.into());
    }

    Ok(())
}

pub fn check_is_program_working(value: ProgramStatus) -> Result<()> {
    if value.eq(&ProgramStatus::Halted) {
        return Err(CreamPadError::ProgramHalted.into());
    }

    Ok(())
}

pub fn check_round_limit(from_config: u16, from_param: u16) -> Result<()> {
    if from_param > from_config {
        return Err(CreamPadError::ExceedRoundsLimit.into());
    }

    Ok(())
}

pub fn check_ptmax(p0: u64, ptmax: u64) -> Result<()> {
    if p0 < ptmax {
        return Err(CreamPadError::InvalidPTMax.into());
    }

    Ok(())
}

pub fn check_signer_exist(instruction: Instruction, signer_account: Pubkey) -> Result<()> {
    if !instruction
        .accounts
        .iter()
        .any(|acc| acc.pubkey == signer_account && acc.is_signer)
    {
        return Err(CreamPadError::MissingSigner.into());
    }

    Ok(())
}

pub fn try_get_remaining_account_info<T>(remaining_accounts: &[T], index: usize) -> Result<&T> {
    if index < remaining_accounts.len() {
        Ok(&remaining_accounts[index])
    } else {
        Err(CreamPadError::MissingAccount.into())
    }
}

pub fn check_round_ender(creator: Pubkey, back_authority: Pubkey, ender: Pubkey) -> Result<()> {
    if ender != creator && ender != back_authority {
        return Err(CreamPadError::InvalidRoundEnder.into());
    }

    Ok(())
}

pub fn check_round_starter(creator: Pubkey, back_authority: Pubkey, starter: Pubkey) -> Result<()> {
    if starter != creator && starter != back_authority {
        return Err(CreamPadError::InvalidRoundStarter.into());
    }

    Ok(())
}

pub fn check_supply_locker(creator: Pubkey, back_authority: Pubkey, locker: Pubkey) -> Result<()> {
    if locker != creator && locker != back_authority {
        return Err(CreamPadError::InvalidSupplyLocker.into());
    }

    Ok(())
}

pub fn check_creator(creator: Pubkey, from_input: Pubkey) -> Result<()> {
    if from_input != creator {
        return Err(CreamPadError::InvalidCreator.into());
    }

    Ok(())
}

pub fn check_is_auction_round_ended(status: AuctionRoundStatus) -> Result<()> {
    if status.eq(&AuctionRoundStatus::Ended) {
        return Err(CreamPadError::AuctionRoundAlreadyEnded.into());
    }

    Ok(())
}

pub fn check_is_previous_auction_round_ended(status: AuctionRoundStatus) -> Result<()> {
    if status.eq(&AuctionRoundStatus::Started) {
        return Err(CreamPadError::AuctionPreviousRoundNotEnded.into());
    }

    Ok(())
}

pub fn check_is_auction_ended_or_sold_out(status: AuctionStatus) -> Result<()> {
    if !status.eq(&AuctionStatus::Started) {
        return Err(CreamPadError::AuctionIsEndedOrSoldOut.into());
    }

    Ok(())
}

pub fn check_current_round(value_a: u16, value_b: u16) -> Result<()> {
    if value_a != value_b {
        return Err(CreamPadError::InvalidCurrentRound.into());
    }

    Ok(())
}

pub fn check_previous_round(value_a: u16, value_b: u16) -> Result<()> {
    if value_a != value_b {
        return Err(CreamPadError::InvalidPreviousRound.into());
    }

    Ok(())
}

pub fn check_next_round(value_a: u16, value_b: u16) -> Result<()> {
    if value_a != value_b {
        return Err(CreamPadError::InvalidNextRound.into());
    }

    Ok(())
}

pub fn check_is_auction_round_still_have_time(can_ended_at: i64, current_time: i64) -> Result<()> {
    if can_ended_at > current_time {
        return Err(CreamPadError::AuctionRoundStillHaveTime.into());
    }

    Ok(())
}

pub fn check_is_auction_round_time_run_out(end_at: i64, current_time: i64) -> Result<()> {
    if end_at < current_time {
        return Err(CreamPadError::AuctionRoundTimeRunOut.into());
    }

    Ok(())
}

pub fn check_remaining_supply(current_supply: u64, total_supply: u64) -> Result<()> {
    if current_supply > total_supply {
        return Err(CreamPadError::SupplyExceeded.into());
    }

    Ok(())
}

pub fn check_payment_receiver(value_a: Pubkey, value_b: Pubkey) -> Result<()> {
    if value_a != value_b {
        return Err(CreamPadError::InvalidPaymentReceiver.into());
    }

    Ok(())
}

pub fn check_payment_fee_receiver(value_a: Pubkey, value_b: Pubkey) -> Result<()> {
    if value_a != value_b {
        return Err(CreamPadError::InvalidPaymentFeeReceiver.into());
    }

    Ok(())
}

pub fn check_payment_mint_account(value_a: Pubkey, value_b: Pubkey) -> Result<()> {
    if value_a != value_b {
        return Err(CreamPadError::InvalidPaymentMintAccount.into());
    }

    Ok(())
}

pub fn check_token_account_authority(value_a: Pubkey, value_b: Pubkey) -> Result<()> {
    if value_a != value_b {
        return Err(CreamPadError::InvalidTokenAccountAuthority.into());
    }

    Ok(())
}

pub fn check_buy_index(value_a: u64, value_b: u64) -> Result<()> {
    if value_a != value_b {
        return Err(CreamPadError::InvalidBuyIndex.into());
    }

    Ok(())
}

pub fn check_is_auction_ended(status: AuctionStatus) -> Result<()> {
    if !status.eq(&AuctionStatus::Ended) {
        return Err(CreamPadError::AuctionNotEnded.into());
    }

    Ok(())
}

pub fn check_is_auction_is_locked(status: AuctionStatus) -> Result<()> {
    if !status.eq(&AuctionStatus::UnsoldLockedAndDistributionOpen) {
        return Err(CreamPadError::AuctionNotAtLock.into());
    }

    Ok(())
}

pub fn check_can_unlock(unlock_at: i64, current_at: i64) -> Result<()> {
    if unlock_at > current_at {
        return Err(CreamPadError::AuctionHaveTimeToUnlock.into());
    }

    Ok(())
}

pub fn check_is_auction_is_distribution(status: AuctionStatus) -> Result<()> {
    if !status.eq(&AuctionStatus::UnsoldLockedAndDistributionOpen)
        && !status.eq(&AuctionStatus::UnsoldUnlocked)
    {
        return Err(CreamPadError::AuctionNotAtDistribution.into());
    }

    Ok(())
}

pub fn check_round_buy_limit(current_amount: u64, buy_limit: u64) -> Result<()> {
    if current_amount > buy_limit {
        return Err(CreamPadError::BuyLimitExceeded.into());
    }

    Ok(())
}

pub fn check_unique_creators(creators: &Vec<AssetCreator>) -> Result<()> {
    let mut seen_addresses = HashSet::new();

    for creator in creators {
        if !seen_addresses.insert(creator.address) {
            return Err(CreamPadError::DuplicateCreatorAddress.into());
        }
    }

    Ok(())
}

pub fn check_creators_share(share: u8) -> Result<()> {
    if share != 100 {
        return Err(CreamPadError::InvalidCreatorShare.into());
    };

    Ok(())
}

pub fn check_seller_fee_basis_points(seller_fee_basis_points: u16) -> Result<()> {
    if seller_fee_basis_points > BASE_POINT {
        return Err(CreamPadError::InvalidSellerFeeBasisPoints.into());
    };

    Ok(())
}

pub fn check_supply_evenly_divisible(supply: u64, t_max: u64) -> Result<()> {
    if supply % t_max != 0 {
        return Err(CreamPadError::SupplyNotEvenlyDivisible.into());
    };

    Ok(())
}

pub fn check_is_exceeding_end_index(current_index: u64, end_index: u64) -> Result<()> {
    if current_index > end_index {
        return Err(CreamPadError::ExceedingEndIndex.into());
    };

    Ok(())
}

pub fn check_is_treasury_full(current: u64, total: u64) -> Result<()> {
    if current > total {
        return Err(CreamPadError::TreasuryFull.into());
    };

    Ok(())
}

pub fn check_is_receipt_full(current: u64, total: u64) -> Result<()> {
    if current > total {
        return Err(CreamPadError::ReceiptFull.into());
    };

    Ok(())
}

pub fn check_is_distribution_full(current: u64, total: u64) -> Result<()> {
    if current > total {
        return Err(CreamPadError::DistributionFull.into());
    };

    Ok(())
}

pub fn check_treasury(
    treasury_from_account: Pubkey,
    treasury_from_input_accounts: Pubkey,
) -> Result<()> {
    if treasury_from_account != treasury_from_input_accounts {
        return Err(CreamPadError::InvalidTreasury.into());
    }

    Ok(())
}

pub fn check_eligible_for_collection_distribution(share: u64) -> Result<()> {
    if share <= 0 {
        return Err(CreamPadError::NotEligibleForCollectionDistribution.into());
    }

    Ok(())
}

///////////// MATH ///////////////

pub fn calculate_boost(
    actual_sales: u64,
    expected_sales: u64,
    omega: u64,
    alpha: u64,
    time_shift_max: u64,
) -> u64 {
    if actual_sales >= expected_sales {
        let ratio = actual_sales as f64 / expected_sales as f64; //   Use f64 for precision
        return (alpha as f64 * omega as f64 * ratio).min(time_shift_max as f64) as u64;
    }
    0 // No boost if sales are below target
}

pub fn calculate_price(
    p0: u64,               // Initial price
    ptmax: u64,            // Minimum price
    t_max: u64,            // Total rounds (time)
    current_round: usize,  // Current round index
    boost_history: &[u64], // Boost applied per round
    decay_model: DecayModelType,
    time_shift_max: u64, // Maximum shift in time-based decay
) -> u64 {
    let mut total_boost: f64 = 0.0; // Use f64 for precision

    for &boost in boost_history.iter().take(current_round) {
        total_boost += 1.0 - boost.min(time_shift_max) as f64; // Fix boost impact
    }

    if decay_model == DecayModelType::Linear {
        let k0 = (p0 as f64 - ptmax as f64) / (t_max - 1) as f64;
        let new_price = (p0 as f64 - k0 * total_boost).max(ptmax as f64);
        return new_price as u64;
    } else {
        if p0 <= ptmax {
            return ptmax;
        }

        let lambda0 = ((p0 as f64).ln() - (ptmax as f64).ln()) / (t_max - 1) as f64;
        let new_price = (p0 as f64 * (-lambda0 * total_boost).exp()).max(ptmax as f64);
        return new_price as u64;
    }
}

// Utility to adjust amount based on mint decimals
pub fn adjust_amount(amount: u64, from_decimals: u8, to_decimals: u8) -> u64 {
    if to_decimals > from_decimals {
        amount * 10u64.pow((to_decimals - from_decimals) as u32)
    } else {
        amount / 10u64.pow((from_decimals - to_decimals) as u32)
    }
}

// Calculate total price dynamically based on mint decimals
pub fn calculate_total_price(
    amount: u64,
    price: u64,
    from_decimals: u8,
    to_decimals: u8,
    output_decimals: u8,
) -> u64 {
    let adjusted_amount = adjust_amount(amount, from_decimals, to_decimals);
    let adjusted_price = adjust_amount(price, from_decimals, output_decimals);

    let amount_in_point: u128 = adjusted_amount as u128;
    let price_in_point: u128 = adjusted_price as u128;

    let total_price: u128 = (amount_in_point * price_in_point) / 10u128.pow(output_decimals as u32);
    total_price as u64
}
