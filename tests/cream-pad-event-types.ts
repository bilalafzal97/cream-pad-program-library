/// EVENT

import {PublicKey} from "@solana/web3.js";
import {BN} from "@coral-xyz/anchor";

export const InitializePadEventName = "InitializePadEvent";

export interface InitializePadEvent {
    timestamp: BN,

    creator: PublicKey,

    mint: PublicKey,

    padName: string,

    paymentReceiver: PublicKey,

    roundDuration: BN,

    p0: BN,

    ptmax: BN,

    tmax: number,

    omega: BN,

    alpha: BN,

    timeShiftMax: BN,

    haveBuyLimit: boolean,

    buyLimit: BN,
}

export const UpdatePadEventName = "UpdatePadEvent";

export interface UpdatePadEvent {
    timestamp: BN,

    mint: PublicKey,

    padName: string,

    paymentReceiver: PublicKey,
}

export const EndRoundEventName = "EndRoundEvent";

export interface EndRoundEvent {
    timestamp: BN,

    mint: PublicKey,

    padName: string,

    roundIndex: string,

    boost: BN,
}

export const StartRoundEventName = "StartRoundEvent";

export interface StartRoundEvent {
    timestamp: BN,

    mint: PublicKey,

    padName: string,

    previousRoundIndex: string,

    nextRoundIndex: string,

    nextRoundDuration: BN,

    currentPrice: BN,

    nextHaveBuyLimit: boolean,

    nextBuyLimit: BN,
}

export const LockAndDistributionEventName = "LockAndDistributionEvent";

export interface LockAndDistributionEvent {
    timestamp: BN,

    mint: PublicKey,

    padName: string,

    totalUnsoldSupplyLocked: BN,

    unsoldSupplyCanUnlockAt: BN,

    totalUnsoldSupplyDistribution: BN,
}


export const UnlockUnsoldSupplyEventName = "UnlockUnsoldSupplyEvent";

export interface UnlockUnsoldSupplyEvent {
    timestamp: BN,

    mint: PublicKey,

    padName: string,
}

export const BuyEventName = "BuyEvent";

export interface BuyEvent {
    timestamp: BN,

    mint: PublicKey,

    padName: string,

    user: PublicKey,

    amount: BN,

    fee: BN,

    price: BN,

    currentRound: string,

    userBuyIndex: string,

    totalPrice: BN,

    isEndedAndSoldOut: boolean,
}

export const ClaimDistributionEventName = "ClaimDistributionEvent";

export interface ClaimDistributionEvent {
    timestamp: BN,

    mint: PublicKey,

    padName: string,

    user: PublicKey,

    amount: BN,
}

// Collection

export const InitializeCollectionPadEventName = "InitializeCollectionPadEvent";

export interface InitializeCollectionPadEvent {
    timestamp: BN,

    creator: PublicKey,

    collectionMint: PublicKey,

    padName: string,

    paymentReceiver: PublicKey,

    roundDuration: BN,

    p0: BN,

    ptmax: BN,

    tmax: number,

    omega: BN,

    alpha: BN,

    timeShiftMax: BN,

    haveBuyLimit: boolean,

    buyLimit: BN,

    startingIndex: BN,

    endingIndex: BN,
}

export const UpdateCollectionPadEventName = "UpdateCollectionPadEvent";

export interface UpdateCollectionPadEvent {
    timestamp: BN,

    collectionMint: PublicKey,

    padName: string,

    paymentReceiver: PublicKey,
}

export const EndCollectionRoundEventName = "EndCollectionRoundEvent";

export interface EndCollectionRoundEvent {
    timestamp: BN,

    collectionMint: PublicKey,

    padName: string,

    roundIndex: string,

    boost: BN,
}

export const StartCollectionRoundEventName = "StartCollectionRoundEvent";

export interface StartCollectionRoundEvent {
    timestamp: BN,

    collectionMint: PublicKey,

    padName: string,

    previousRoundIndex: string,

    nextRoundIndex: string,

    nextRoundDuration: BN,

    currentPrice: BN,

    nextHaveBuyLimit: boolean,

    nextBuyLimit: BN,
}

export const TakeCollectionUpdateAuthorityEventName = "TakeCollectionUpdateAuthorityEvent";

export interface TakeCollectionUpdateAuthorityEvent {
    timestamp: BN,

    collectionMint: PublicKey,

    padName: string,
}

export const GiveCollectionUpdateAuthorityEventName = "GiveCollectionUpdateAuthorityEvent";

export interface GiveCollectionUpdateAuthorityEvent {
    timestamp: BN,

    collectionMint: PublicKey,

    padName: string,

    newCollectionUpdateAuthority: PublicKey,
}

export const TreasuryAndDistributionEventName = "TreasuryAndDistributionEvent";

export interface TreasuryAndDistributionEvent {
    timestamp: BN,

    collectionMint: PublicKey,

    padName: string,

    treasurySupply: BN,

    distributionSupply: BN,
}

export const MintTreasuryAssetEventName = "MintTreasuryAssetEvent";

export interface MintTreasuryAssetEvent {
    timestamp: BN,

    collectionMint: PublicKey,

    padName: string,

    assetUuid: string,

    assetIndex: BN,

    assetMintAccount: PublicKey,
}

export const BuyCollectionAssetEventName = "BuyCollectionAssetEvent";

export interface BuyCollectionAssetEvent {
    timestamp: BN,

    collectionMint: PublicKey,

    padName: string,

    user: PublicKey,

    amount: BN,

    fee: BN,

    mintingFee: BN,

    price: BN,

    currentRound: string,

    userBuyIndex: string,

    totalPrice: BN,

    isEndedAndSoldOut: boolean,
}

export const FillBoughtCollectionAssetEventName = "FillBoughtCollectionAssetEvent";

export interface FillBoughtCollectionAssetEvent {
    timestamp: BN,

    collectionMint: PublicKey,

    padName: string,

    assetUuid: string,

    assetIndex: BN,

    buyIndex: BN,

    user: PublicKey,

    assetMintAccount: PublicKey,
}

export const CollectionClaimDistributionEventName = "CollectionClaimDistributionEvent";

export interface CollectionClaimDistributionEvent {
    timestamp: BN,

    collectionMint: PublicKey,

    padName: string,

    user: PublicKey,

    amount: BN,
}

export const FillClaimedCollectionAssetDistributionEventName = "FillClaimedCollectionAssetDistributionEvent";

export interface FillClaimedCollectionAssetDistributionEvent {
    timestamp: BN,

    collectionMint: PublicKey,

    padName: string,

    assetUuid: string,

    assetIndex: BN,

    user: PublicKey,

    assetMintAccount: PublicKey,
}

export const handleInitializePadEvent = (ev: InitializePadEvent) =>
    console.log(`${InitializePadEventName} ==> `, ev);

export const handleUpdatePadEvent = (ev: UpdatePadEvent) =>
    console.log(`${UpdatePadEventName} ==> `, ev);

export const handleEndRoundEvent = (ev: EndRoundEvent) =>
    console.log(`${EndRoundEventName} ==> `, ev);


export const handleStartRoundEvent = (ev: StartRoundEvent) =>
    console.log(`${StartRoundEventName} ==> `, ev);


export const handleLockAndDistributionEvent = (ev: LockAndDistributionEvent) =>
    console.log(`${LockAndDistributionEventName} ==> `, ev);


export const handleUnlockUnsoldSupplyEvent = (ev: UnlockUnsoldSupplyEvent) =>
    console.log(`${UnlockUnsoldSupplyEventName} ==> `, ev);

export const handleBuyEvent = (ev: BuyEvent) =>
    console.log(`${BuyEventName} ==> `, ev);


export const handleClaimDistributionEvent = (ev: ClaimDistributionEvent) =>
    console.log(`${ClaimDistributionEventName} ==> `, ev);

// Collection

export const handleInitializeCollectionPadEvent = (ev: InitializeCollectionPadEvent) =>
    console.log(`${InitializeCollectionPadEventName} ==> `, ev);

export const handleUpdateCollectionPadEvent = (ev: UpdateCollectionPadEvent) =>
    console.log(`${UpdateCollectionPadEventName} ==> `, ev);

export const handleEndCollectionRoundEvent = (ev: EndCollectionRoundEvent) =>
    console.log(`${EndCollectionRoundEventName} ==> `, ev);

export const handleStartCollectionRoundEvent = (ev: StartCollectionRoundEvent) =>
    console.log(`${StartCollectionRoundEventName} ==> `, ev);

export const handleTakeCollectionUpdateAuthorityEvent = (ev: TakeCollectionUpdateAuthorityEvent) =>
    console.log(`${TakeCollectionUpdateAuthorityEventName} ==> `, ev);

export const handleGiveCollectionUpdateAuthorityEvent = (ev: GiveCollectionUpdateAuthorityEvent) =>
    console.log(`${GiveCollectionUpdateAuthorityEventName} ==> `, ev);

export const handleTreasuryAndDistributionEvent = (ev: TreasuryAndDistributionEvent) =>
    console.log(`${TreasuryAndDistributionEventName} ==> `, ev);

export const handleMintTreasuryAssetEvent = (ev: MintTreasuryAssetEvent) =>
    console.log(`${MintTreasuryAssetEventName} ==> `, ev);

export const handleBuyCollectionAssetEvent = (ev: BuyCollectionAssetEvent) =>
    console.log(`${BuyCollectionAssetEventName} ==> `, ev);

export const handleFillBoughtCollectionAssetEvent = (ev: FillBoughtCollectionAssetEvent) =>
    console.log(`${FillBoughtCollectionAssetEventName} ==> `, ev);

export const handleCollectionClaimDistributionEvent = (ev: CollectionClaimDistributionEvent) =>
    console.log(`${CollectionClaimDistributionEventName} ==> `, ev);

export const handleFillClaimedCollectionAssetDistributionEvent = (ev: FillClaimedCollectionAssetDistributionEvent) =>
    console.log(`${FillClaimedCollectionAssetDistributionEventName} ==> `, ev);