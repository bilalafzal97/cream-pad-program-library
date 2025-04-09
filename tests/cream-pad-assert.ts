///// Assert
import {Connection, PublicKey} from "@solana/web3.js";
import {assert} from "chai";
import {BN, Program} from "@coral-xyz/anchor";
import {CreamPad} from "../target/types/cream_pad";
import {
    AuctionRoundStatusType,
    AuctionStatusType,
    DecayModelType,
    ProgramStatusType,
    UserAuctionStatusType
} from "./cream-pad-enum";

interface LocalCreator {
    share: number,
    address: PublicKey
}

export async function assertTokenBalance(connection: Connection, ata: PublicKey, balance: number, message: string, assertMessage: string) {

    const ataBalance = await connection.getTokenAccountBalance(ata);

    console.log(message);
    console.log(ataBalance);

    assert(ataBalance.value.uiAmount === balance, assertMessage);
}

export async function assertCreamPadAccount(program: Program<CreamPad>, pdaAddress: PublicKey, signingAuthority: PublicKey, backAuthority: PublicKey, isBackAuthorityRequired: boolean, programStatus: ProgramStatusType, isFeeRequired: boolean, feeBasePoint: number, feeReceiver: PublicKey, roundLimit: number, distributionBasePoint: number, lockBasePoint: number, lockDuration: BN, mintingFee: BN, treasury: PublicKey) {
    const data = await program.account.creamPadAccount.fetch(pdaAddress);

    console.log("Cream pad account: >>>>>>>> ", data);

    assert(data.signingAuthority.toBase58() === signingAuthority.toBase58(), "Cream Pad -> signingAuthority");
    assert(data.backAuthority.toBase58() === backAuthority.toBase58(), "Cream Pad -> backAuthority");
    assert(data.isBackAuthorityRequired === isBackAuthorityRequired, "Cream Pad -> isBackAuthorityRequired");
    assert(JSON.stringify(data.programStatus) === JSON.stringify(programStatus), "Cream Pad -> programStatus");
    assert(data.isFeeRequired === isFeeRequired, "Cream Pad -> isFeeRequired");
    assert(data.feeBasePoint === feeBasePoint, "Cream Pad -> feeBasePoint");
    assert(data.feeReceiver.toBase58() === feeReceiver.toBase58(), "Cream Pad -> feeReceiver");
    assert(data.roundLimit === roundLimit, "Cream Pad -> roundLimit");
    assert(data.distributionBasePoint === distributionBasePoint, "Cream Pad -> distributionBasePoint");
    assert(data.lockBasePoint === lockBasePoint, "Cream Pad -> lockBasePoint");
    assert(data.lockDuration.toNumber() === lockDuration.toNumber(), "Cream Pad -> lockDuration");
    assert(data.mintingFee.toNumber() === mintingFee.toNumber(), "Cream Pad -> mintingFee");
    assert(data.treasury.toBase58 === treasury.toBase58, "Cream Pad -> treasury");
}

export async function assertAuctionAccount(
    program: Program<CreamPad>,
    pdaAddress: PublicKey,
    creator: PublicKey,
    mint: PublicKey,
    paymentMint: PublicKey,
    paymentReceiver: PublicKey,
    status: AuctionStatusType,
    p0: BN,
    ptmax: BN,
    tmax: number,
    omega: BN,
    alpha: BN,
    timeShiftMax: BN,
    currentPrice: BN,
    currentRound: number,
    boostHistory: BN[],
    decayModel: DecayModelType,
    totalSupply: BN,
    totalSupplySold: BN,
    totalUserBuyCount: BN,
    totalUserCount: BN,
    totalUnsoldSupplyLocked: BN,
    unsoldSupplyLockedAt: BN,
    unsoldSupplyCanUnlockAt: BN,
    unsoldSupplyUnlockedAt: BN,
    totalUnsoldSupplyDistribution: BN,
    totalUnsoldSupplyDistributionClaimed: BN,
    totalUnsoldSupplyDistributionClaimedCount: BN,
    totalPayment: BN,
    totalFee: BN
) {
    const data = await program.account.auctionAccount.fetch(pdaAddress);

    console.log("Auction account: >>>>>>>> ", data);

    assert(data.creator.toBase58() === creator.toBase58(), "Auction -> creator");
    assert(data.mint.toBase58() === mint.toBase58(), "Auction -> mint");
    assert(data.paymentMint.toBase58() === paymentMint.toBase58(), "Auction -> paymentMint");
    assert(data.paymentReceiver.toBase58() === paymentReceiver.toBase58(), "Auction -> paymentReceiver");
    assert(JSON.stringify(data.status) === JSON.stringify(status), "Auction -> status");
    assert(data.p0.toNumber() === p0.toNumber(), "Auction -> p0");
    assert(data.ptmax.toNumber() === ptmax.toNumber(), "Auction -> ptmax");
    assert(data.tmax === tmax, "Auction -> tmax");
    assert(data.omega.toNumber() === omega.toNumber(), "Auction -> omega");
    assert(data.alpha.toNumber() === alpha.toNumber(), "Auction -> alpha");
    assert(data.timeShiftMax.toNumber() === timeShiftMax.toNumber(), "Auction -> timeShiftMax");
    assert(data.currentPrice.toNumber() === currentPrice.toNumber(), "Auction -> currentPrice");
    assert(data.currentRound === currentRound, "Auction -> currentRound");

    for (let i = 0; i < data.boostHistory.length; i++) {
        assert(data.boostHistory[i].toNumber() === boostHistory[i].toNumber(), "Auction -> boostHistory");
    }

    assert(JSON.stringify(data.decayModel) === JSON.stringify(decayModel), "Auction -> decayModel");

    assert(data.totalSupply.toNumber() === totalSupply.toNumber(), "Auction -> totalSupply");
    assert(data.totalSupplySold.toNumber() === totalSupplySold.toNumber(), "Auction -> totalSupplySold");
    assert(data.totalUserBuyCount.toNumber() === totalUserBuyCount.toNumber(), "Auction -> totalUserBuyCount");
    assert(data.totalUserCount.toNumber() === totalUserCount.toNumber(), "Auction -> totalUserCount");
    assert(data.totalUnsoldSupplyLocked.toNumber() === totalUnsoldSupplyLocked.toNumber(), "Auction -> totalUnsoldSupplyLocked");
    assert(data.unsoldSupplyLockedAt.toNumber() === unsoldSupplyLockedAt.toNumber(), "Auction -> unsoldSupplyLockedAt");
    assert(data.unsoldSupplyCanUnlockAt.toNumber() === unsoldSupplyCanUnlockAt.toNumber(), "Auction -> unsoldSupplyCanUnlockAt");
    assert(data.unsoldSupplyUnlockedAt.toNumber() === unsoldSupplyUnlockedAt.toNumber(), "Auction -> unsoldSupplyUnlockedAt");
    assert(data.totalUnsoldSupplyDistribution.toNumber() === totalUnsoldSupplyDistribution.toNumber(), "Auction -> totalUnsoldSupplyDistribution");
    assert(data.totalUnsoldSupplyDistributionClaimed.toNumber() === totalUnsoldSupplyDistributionClaimed.toNumber(), "Auction -> totalUnsoldSupplyDistributionClaimed");
    assert(data.totalUnsoldSupplyDistributionClaimedCount.toNumber() === totalUnsoldSupplyDistributionClaimedCount.toNumber(), "Auction -> totalUnsoldSupplyDistributionClaimedCount");
    assert(data.totalPayment.toNumber() === totalPayment.toNumber(), "Auction -> totalPayment");
    assert(data.totalFee.toNumber() === totalFee.toNumber(), "Auction -> totalFee");
}

export async function assertAuctionRoundAccount(
    program: Program<CreamPad>,
    pdaAddress: PublicKey,
    roundStartAt: BN,
    roundEndAt: BN,
    totalSupplySold: BN,
    totalUserBuyCount: BN,
    totalUserCount: BN,
    boost: BN,
    price: BN,
    status: AuctionRoundStatusType,
    totalPayment: BN,
    totalFee: BN,
    round: number,
    roundEndedAt: BN,
    haveBuyLimit: boolean,
    buyLimit: BN
) {
    const data = await program.account.auctionRoundAccount.fetch(pdaAddress);

    console.log("Auction Round account: >>>>>>>> ", data);

    assert(data.roundStartAt.toNumber() === roundStartAt.toNumber(), "Auction Round -> roundStartAt");
    assert(data.roundEndAt.toNumber() === roundEndAt.toNumber(), "Auction Round -> roundEndAt");
    assert(data.totalSupplySold.toNumber() === totalSupplySold.toNumber(), "Auction Round -> totalSupplySold");
    assert(data.totalUserBuyCount.toNumber() === totalUserBuyCount.toNumber(), "Auction Round -> totalUserBuyCount");
    assert(data.totalUserCount.toNumber() === totalUserCount.toNumber(), "Auction Round -> totalUserCount");
    assert(data.boost.toNumber() === boost.toNumber(), "Auction Round -> boost");
    assert(data.price.toNumber() === price.toNumber(), "Auction Round -> price");
    assert(JSON.stringify(data.status) === JSON.stringify(status), "Auction Round -> status");
    assert(data.totalPayment.toNumber() === totalPayment.toNumber(), "Auction Round -> totalPayment");
    assert(data.totalFee.toNumber() === totalFee.toNumber(), "Auction Round -> totalFee");
    assert(data.round === round, "Auction Round -> round");
    assert(data.roundEndedAt.toNumber() === roundEndedAt.toNumber(), "Auction Round -> roundEndedAt");
    assert(data.roundEndedAt.toNumber() === roundEndedAt.toNumber(), "Auction Round -> roundEndedAt");
    assert(data.haveBuyLimit === haveBuyLimit, "Auction Round -> haveBuyLimit");
    assert(data.buyLimit.toNumber() === buyLimit.toNumber(), "Auction Round -> buyLimit");
}

export async function assertUserAuctionAccount(
    program: Program<CreamPad>,
    pdaAddress: PublicKey,
    user: PublicKey,
    totalBuyCount: BN,
    totalBuyAmount: BN,
    totalPayment: BN,
    status: UserAuctionStatusType
) {
    const data = await program.account.userAuctionAccount.fetch(pdaAddress);

    console.log("User auction account: >>>>>>>> ", data);

    assert(data.user.toBase58() === user.toBase58(), "User Auction -> user");
    assert(data.totalBuyCount.toNumber() === totalBuyCount.toNumber(), "User Auction -> totalBuyCount");
    assert(data.totalBuyAmount.toNumber() === totalBuyAmount.toNumber(), "User Auction -> totalBuyAmount");
    assert(data.totalPayment.toNumber() === totalPayment.toNumber(), "User Auction -> totalPayment");
    assert(JSON.stringify(data.status) === JSON.stringify(status), "User Auction -> status");
}

export async function assertUserAuctionRoundAccount(
    program: Program<CreamPad>,
    pdaAddress: PublicKey,
    totalBuyCount: BN,
    totalBuyAmount: BN,
    totalPayment: BN,
    round: number
) {
    const data = await program.account.userAuctionRoundAccount.fetch(pdaAddress);

    console.log("User auction round account: >>>>>>>> ", data);

    assert(data.totalBuyCount.toNumber() === totalBuyCount.toNumber(), "User Auction Round -> totalBuyCount");
    assert(data.totalBuyAmount.toNumber() === totalBuyAmount.toNumber(), "User Auction Round -> totalBuyAmount");
    assert(data.totalPayment.toNumber() === totalPayment.toNumber(), "User Auction Round -> totalPayment");
    assert(data.round === round, "User Auction Round -> round");
}

export async function assertUserAuctionBuyReceiptAccount(
    program: Program<CreamPad>,
    pdaAddress: PublicKey,
    buyAmount: BN,
    payment: BN,
    round: number,
    index: BN
) {
    const data = await program.account.userAuctionBuyReceiptAccount.fetch(pdaAddress);

    console.log("User auction buy receipt account: >>>>>>>> ", data);

    assert(data.buyAmount.toNumber() === buyAmount.toNumber(), "User Auction Buy Receipt -> buyAmount");
    assert(data.payment.toNumber() === payment.toNumber(), "User Auction Buy Receipt -> payment");
    assert(data.round === round, "User Auction Buy Receipt -> round");
    assert(data.index.toNumber() === index.toNumber(), "User Auction Buy Receipt -> index");
}

export async function assertUserAuctionUnsoldDistributionAccount(
    program: Program<CreamPad>,
    pdaAddress: PublicKey,
    amount: BN
) {
    const data = await program.account.userAuctionUnsoldDistributionAccount.fetch(pdaAddress);

    console.log("User auction unsold distribution account: >>>>>>>> ", data);

    assert(data.amount.toNumber() === amount.toNumber(), "User Auction Unsold Distribution -> amount");
}

export async function assertCollectionAuctionAccount(
    program: Program<CreamPad>,
    pdaAddress: PublicKey,
    creator: PublicKey,
    collectionMint: PublicKey,
    paymentMint: PublicKey,
    paymentReceiver: PublicKey,
    status: AuctionStatusType,
    p0: BN,
    ptmax: BN,
    tmax: number,
    omega: BN,
    alpha: BN,
    timeShiftMax: BN,
    currentPrice: BN,
    currentRound: number,
    boostHistory: BN[],
    decayModel: DecayModelType,
    sellerFeeBasisPoints: number,
    assetCreators: LocalCreator[],
    totalSupply: BN,
    totalSupplySold: BN,
    totalSupplySoldFilled: BN,
    totalUserBuyCount: BN,
    totalUserCount: BN,
    startingIndex: BN,
    endingIndex: BN,
    currentIndex: BN,
    totalUnsoldSupplyToTreasury: BN,
    totalUnsoldSupplyToTreasuryFilled: BN,
    totalUnsoldSupplyDistribution: BN,
    totalUnsoldSupplyDistributionClaimed: BN,
    totalUnsoldSupplyDistributionClaimedCount: BN,
    totalUnsoldSupplyDistributionClaimedFilled: BN,
    totalPayment: BN,
    totalFee: BN,
    totalMintingFee: BN,
    assetName: string,
    assetSymbol: string,
    assetUrl: string,
    assetUrlSuffix: string
) {
    const data = await program.account.collectionAuctionAccount.fetch(pdaAddress);

    console.log("Collection Auction account: >>>>>>>> ", data);

    assert(data.creator.toBase58() === creator.toBase58(), "Auction -> creator");
    assert(data.collectionMint.toBase58() === collectionMint.toBase58(), "Auction -> collectionMint");
    assert(data.paymentMint.toBase58() === paymentMint.toBase58(), "Auction -> paymentMint");
    assert(data.paymentReceiver.toBase58() === paymentReceiver.toBase58(), "Auction -> paymentReceiver");
    assert(JSON.stringify(data.status) === JSON.stringify(status), "Auction -> status");
    assert(data.p0.toNumber() === p0.toNumber(), "Auction -> p0");
    assert(data.ptmax.toNumber() === ptmax.toNumber(), "Auction -> ptmax");
    assert(data.tmax === tmax, "Auction -> tmax");
    assert(data.omega.toNumber() === omega.toNumber(), "Auction -> omega");
    assert(data.alpha.toNumber() === alpha.toNumber(), "Auction -> alpha");
    assert(data.timeShiftMax.toNumber() === timeShiftMax.toNumber(), "Auction -> timeShiftMax");
    assert(data.currentPrice.toNumber() === currentPrice.toNumber(), "Auction -> currentPrice");
    assert(data.currentRound === currentRound, "Auction -> currentRound");

    assert(data.boostHistory.length === boostHistory.length, "Auction -> boostHistory length");

    for (let i = 0; i < data.boostHistory.length; i++) {
        assert(data.boostHistory[i].toNumber() === boostHistory[i].toNumber(), "Auction -> boostHistory");
    }

    assert(JSON.stringify(data.decayModel) === JSON.stringify(decayModel), "Auction -> decayModel");

    assert(data.sellerFeeBasisPoints === sellerFeeBasisPoints, "Auction -> sellerFeeBasisPoints");

    assert(data.assetCreators.length === assetCreators.length, "Auction -> assetCreators length");

    for (let i = 0; i < data.assetCreators.length; i++) {
        assert(data.assetCreators[i].address.toBase58() === assetCreators[i].address.toBase58(), "Auction -> assetCreators address");
        assert(data.assetCreators[i].share === assetCreators[i].share, "Auction -> assetCreators share");
    }


    assert(data.totalSupply.toNumber() === totalSupply.toNumber(), "Auction -> totalSupply");
    assert(data.totalSupplySold.toNumber() === totalSupplySold.toNumber(), "Auction -> totalSupplySold");
    assert(data.totalSupplySoldFilled.toNumber() === totalSupplySoldFilled.toNumber(), "Auction -> totalSupplySoldFilled");
    assert(data.totalUserBuyCount.toNumber() === totalUserBuyCount.toNumber(), "Auction -> totalUserBuyCount");
    assert(data.totalUserCount.toNumber() === totalUserCount.toNumber(), "Auction -> totalUserCount");
    assert(data.startingIndex.toNumber() === startingIndex.toNumber(), "Auction -> startingIndex");
    assert(data.endingIndex.toNumber() === endingIndex.toNumber(), "Auction -> endingIndex");
    assert(data.currentIndex.toNumber() === currentIndex.toNumber(), "Auction -> currentIndex");
    assert(data.totalUnsoldSupplyToTreasury.toNumber() === totalUnsoldSupplyToTreasury.toNumber(), "Auction -> totalUnsoldSupplyToTreasury");
    assert(data.totalUnsoldSupplyToTreasuryFilled.toNumber() === totalUnsoldSupplyToTreasuryFilled.toNumber(), "Auction -> totalUnsoldSupplyToTreasuryFilled");

    assert(data.totalUnsoldSupplyDistribution.toNumber() === totalUnsoldSupplyDistribution.toNumber(), "Auction -> totalUnsoldSupplyDistribution");
    assert(data.totalUnsoldSupplyDistributionClaimed.toNumber() === totalUnsoldSupplyDistributionClaimed.toNumber(), "Auction -> totalUnsoldSupplyDistributionClaimed");
    assert(data.totalUnsoldSupplyDistributionClaimedCount.toNumber() === totalUnsoldSupplyDistributionClaimedCount.toNumber(), "Auction -> totalUnsoldSupplyDistributionClaimedCount");
    assert(data.totalUnsoldSupplyDistributionClaimedFilled.toNumber() === totalUnsoldSupplyDistributionClaimedFilled.toNumber(), "Auction -> totalUnsoldSupplyDistributionClaimedFilled");

    assert(data.totalPayment.toNumber() === totalPayment.toNumber(), "Auction -> totalPayment");
    assert(data.totalFee.toNumber() === totalFee.toNumber(), "Auction -> totalFee");
    assert(data.totalMintingFee.toNumber() === totalMintingFee.toNumber(), "Auction -> totalMintingFee");

    assert(data.assetName === assetName, "Auction -> assetName");
    assert(data.assetSymbol === assetSymbol, "Auction -> assetSymbol");
    assert(data.assetUrl === assetUrl, "Auction -> assetUrl");
    assert(data.assetUrlSuffix === assetUrlSuffix, "Auction -> assetUrlSuffix");
}

export async function assertCollectionAuctionRoundAccount(
    program: Program<CreamPad>,
    pdaAddress: PublicKey,
    roundStartAt: BN,
    roundEndAt: BN,
    totalSupplySold: BN,
    totalUserBuyCount: BN,
    totalUserCount: BN,
    boost: BN,
    price: BN,
    status: AuctionRoundStatusType,
    totalPayment: BN,
    totalFee: BN,
    round: number,
    roundEndedAt: BN,
    haveBuyLimit: boolean,
    buyLimit: BN
) {
    const data = await program.account.collectionAuctionRoundAccount.fetch(pdaAddress);

    console.log("Auction Round account: >>>>>>>> ", data);

    assert(data.roundStartAt.toNumber() === roundStartAt.toNumber(), "Auction Round -> roundStartAt");
    assert(data.roundEndAt.toNumber() === roundEndAt.toNumber(), "Auction Round -> roundEndAt");
    assert(data.totalSupplySold.toNumber() === totalSupplySold.toNumber(), "Auction Round -> totalSupplySold");
    assert(data.totalUserBuyCount.toNumber() === totalUserBuyCount.toNumber(), "Auction Round -> totalUserBuyCount");
    assert(data.totalUserCount.toNumber() === totalUserCount.toNumber(), "Auction Round -> totalUserCount");
    assert(data.boost.toNumber() === boost.toNumber(), "Auction Round -> boost");
    assert(data.price.toNumber() === price.toNumber(), "Auction Round -> price");
    assert(JSON.stringify(data.status) === JSON.stringify(status), "Auction Round -> status");
    assert(data.totalPayment.toNumber() === totalPayment.toNumber(), "Auction Round -> totalPayment");
    assert(data.totalFee.toNumber() === totalFee.toNumber(), "Auction Round -> totalFee");
    assert(data.round === round, "Auction Round -> round");
    assert(data.roundEndedAt.toNumber() === roundEndedAt.toNumber(), "Auction Round -> roundEndedAt");
    assert(data.roundEndedAt.toNumber() === roundEndedAt.toNumber(), "Auction Round -> roundEndedAt");
    assert(data.haveBuyLimit === haveBuyLimit, "Auction Round -> haveBuyLimit");
    assert(data.buyLimit.toNumber() === buyLimit.toNumber(), "Auction Round -> buyLimit");
}