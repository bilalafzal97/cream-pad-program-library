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