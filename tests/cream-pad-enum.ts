/// ENUMS
export type ProgramStatusType =
    | { normal: {} }
    | { halted: {} };

export class ProgramStatus {
    static readonly Normal: ProgramStatusType = {normal: {}};
    static readonly Halted: ProgramStatusType = {halted: {}};
}

export type AuctionStatusType =
    | { started: {} }
    | { ended: {} }
    | { soldOut: {} }
    | { unsoldLockedAndDistributionOpen: {} }
    | { unsoldUnlocked: {} };

export class AuctionStatus {
    static readonly Started: AuctionStatusType = {started: {}};
    static readonly Ended: AuctionStatusType = {ended: {}};
    static readonly SoldOut: AuctionStatusType = {soldOut: {}};
    static readonly UnsoldLockedAndDistributionOpen: AuctionStatusType = {unsoldLockedAndDistributionOpen: {}};
    static readonly UnsoldUnlocked: AuctionStatusType = {unsoldUnlocked: {}};
}

export type AuctionRoundStatusType =
    | { started: {} }
    | { ended: {} };

export class AuctionRoundStatus {
    static readonly Started: AuctionRoundStatusType = {started: {}};
    static readonly Ended: AuctionRoundStatusType = {ended: {}};
}

export type DecayModelType =
    | { linear: {} }
    | { exponential: {} };

export class DecayModel {
    static readonly Linear: DecayModelType = {linear: {}};
    static readonly Exponential: DecayModelType = {exponential: {}};
}

export type UserAuctionStatusType = { none: {} };

export class UserAuctionStatus {
    static readonly None: UserAuctionStatusType = {none: {}};
}