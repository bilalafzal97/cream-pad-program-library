use anchor_lang::prelude::*;

#[error_code]
pub enum CreamPadError {

    #[msg("Invalid signing authority")]
    InvalidSigningAuthority,

    #[msg("Invalid back authority")]
    InvalidBackAuthority,

    #[msg("Value is zero")]
    ValueIsZero,

    #[msg("Invalid fee base point")]
    InvalidFeeBasePoint,

    #[msg("Invalid distribution and lock base point")]
    InvalidDistributionAndLockBasePoint,

    #[msg("Program halted")]
    ProgramHalted,

    #[msg("Exceed rounds limit")]
    ExceedRoundsLimit,

    #[msg("Missing account")]
    MissingAccount,

    #[msg("Missing Signer")]
    MissingSigner,

    #[msg("Invalid round ender")]
    InvalidRoundEnder,

    #[msg("Invalid round starter")]
    InvalidRoundStarter,

    #[msg("Invalid supply locker")]
    InvalidSupplyLocker,

    #[msg("Invalid creator")]
    InvalidCreator,

    #[msg("Auction round still have time")]
    AuctionRoundStillHaveTime,

    #[msg("Auction is ended or sold out")]
    AuctionIsEndedOrSoldOut,

    #[msg("Auction round already ended")]
    AuctionRoundAlreadyEnded,

    #[msg("Invalid current round")]
    InvalidCurrentRound,

    #[msg("Invalid previous round")]
    InvalidPreviousRound,

    #[msg("Invalid next round")]
    InvalidNextRound,

    #[msg("Invalid ptmax")]
    InvalidPTMax,

    #[msg("Auction previous round not ended")]
    AuctionPreviousRoundNotEnded,

    #[msg("Invalid program")]
    InvalidProgram,

    #[msg("Auction time run out")]
    AuctionRoundTimeRunOut,

    #[msg("Invalid payment receiver")]
    InvalidPaymentReceiver,

    #[msg("Invalid payment fee receiver")]
    InvalidPaymentFeeReceiver,

    #[msg("Invalid payment mint account")]
    InvalidPaymentMintAccount,

    #[msg("Supply exceeded")]
    SupplyExceeded,

    #[msg("Supply token account authority")]
    InvalidTokenAccountAuthority,

    #[msg("Invalid buy index")]
    InvalidBuyIndex,

    #[msg("Auction not ended")]
    AuctionNotEnded,

    #[msg("Auction not at lock")]
    AuctionNotAtLock,

    #[msg("Auction not at distribution")]
    AuctionNotAtDistribution,

    #[msg("Auction have time to unlock")]
    AuctionHaveTimeToUnlock,

    #[msg("Buy limit exceeded")]
    BuyLimitExceeded,

    #[msg("Duplicate creator address")]
    DuplicateCreatorAddress,

    #[msg("Invalid creator share")]
    InvalidCreatorShare,

    #[msg("Invalid seller fee basis points")]
    InvalidSellerFeeBasisPoints,

    #[msg("The supply must be evenly divisible by t_max.")]
    SupplyNotEvenlyDivisible,

    #[msg("Exceeding end index")]
    ExceedingEndIndex,

    #[msg("Treasury full")]
    TreasuryFull,

    #[msg("Invalid treasury")]
    InvalidTreasury,

    #[msg("Receipt full")]
    ReceiptFull,

    #[msg("Not eligible for collection distribution")]
    NotEligibleForCollectionDistribution,
}
