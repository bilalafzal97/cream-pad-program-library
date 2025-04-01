import * as anchor from "@coral-xyz/anchor";
import {BN, Program} from "@coral-xyz/anchor";
import {
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SYSVAR_RENT_PUBKEY,
    SystemProgram,
    SYSVAR_INSTRUCTIONS_PUBKEY,
    Connection
} from "@solana/web3.js";
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccount,
    createMint,
    getAssociatedTokenAddress,
    mintToChecked,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    getMint
} from '@solana/spl-token';
import {assert} from "chai";
import {CreamPad} from "../target/types/cream_pad";

/// EVENT

const InitializePadEventName = "InitializePadEvent";

interface InitializePadEvent {
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

const UpdatePadEventName = "UpdatePadEvent";

interface UpdatePadEvent {
    timestamp: BN,

    mint: PublicKey,

    padName: string,

    paymentReceiver: PublicKey,
}

const EndRoundEventName = "EndRoundEvent";

interface EndRoundEvent {
    timestamp: BN,

    mint: PublicKey,

    padName: string,

    roundIndex: string,

    boost: BN,
}

const StartRoundEventName = "StartRoundEvent";

interface StartRoundEvent {
    timestamp: BN,

    mint: PublicKey,

    padName: string,

    previousRoundIndex: string,

    nextRoundIndex: string,

    nextRoundDuration: BN,

    currentPrice: BN,
}

const LockAndDistributionEventName = "LockAndDistributionEvent";

interface LockAndDistributionEvent {
    timestamp: BN,

    mint: PublicKey,

    padName: string,

    totalUnsoldSupplyLocked: BN,

    unsoldSupplyCanUnlockAt: BN,

    totalUnsoldSupplyDistribution: BN,
}


const UnlockUnsoldSupplyEventName = "UnlockUnsoldSupplyEvent";

interface UnlockUnsoldSupplyEvent {
    timestamp: BN,

    mint: PublicKey,

    padName: string,
}

const BuyEventName = "BuyEvent";

interface BuyEvent {
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

const ClaimDistributionEventName = "ClaimDistributionEvent";

interface ClaimDistributionEvent {
    timestamp: BN,

    mint: PublicKey,

    padName: string,

    user: PublicKey,

    amount: BN,
}

const handleInitializePadEvent = (ev: InitializePadEvent) =>
    console.log(`${InitializePadEventName} ==> `, ev);

const handleUpdatePadEvent = (ev: UpdatePadEvent) =>
    console.log(`${UpdatePadEventName} ==> `, ev);

const handleEndRoundEvent = (ev: EndRoundEvent) =>
    console.log(`${EndRoundEventName} ==> `, ev);


const handleStartRoundEvent = (ev: StartRoundEvent) =>
    console.log(`${StartRoundEventName} ==> `, ev);


const handleLockAndDistributionEvent = (ev: LockAndDistributionEvent) =>
    console.log(`${LockAndDistributionEventName} ==> `, ev);


const handleUnlockUnsoldSupplyEvent = (ev: UnlockUnsoldSupplyEvent) =>
    console.log(`${UnlockUnsoldSupplyEventName} ==> `, ev);

const handleBuyEvent = (ev: BuyEvent) =>
    console.log(`${BuyEventName} ==> `, ev);


const handleClaimDistributionEvent = (ev: ClaimDistributionEvent) =>
    console.log(`${ClaimDistributionEventName} ==> `, ev);

/// ENUMS
type ProgramStatusType =
    | { normal: {} }
    | { halted: {} };

class ProgramStatus {
    static readonly Normal: ProgramStatusType = {normal: {}};
    static readonly Halted: ProgramStatusType = {halted: {}};
}

type AuctionStatusType =
    | { started: {} }
    | { ended: {} }
    | { soldOut: {} }
    | { unsoldLockedAndDistributionOpen: {} }
    | { unsoldUnlocked: {} };

class AuctionStatus {
    static readonly Started: AuctionStatusType = {started: {}};
    static readonly Ended: AuctionStatusType = {ended: {}};
    static readonly SoldOut: AuctionStatusType = {soldOut: {}};
    static readonly UnsoldLockedAndDistributionOpen: AuctionStatusType = {unsoldLockedAndDistributionOpen: {}};
    static readonly UnsoldUnlocked: AuctionStatusType = {unsoldUnlocked: {}};
}

type AuctionRoundStatusType =
    | { started: {} }
    | { ended: {} };

class AuctionRoundStatus {
    static readonly Started: AuctionRoundStatusType = {started: {}};
    static readonly Ended: AuctionRoundStatusType = {ended: {}};
}

type DecayModelType =
    | { linear: {} }
    | { exponential: {} };

class DecayModel {
    static readonly Linear: DecayModelType = {linear: {}};
    static readonly Exponential: DecayModelType = {exponential: {}};
}

type UserAuctionStatusType = { none: {} };

class UserAuctionStatus {
    static readonly None: UserAuctionStatusType = {none: {}};
}


/// Prefix
const CREAM_PAD_ACCOUNT_PREFIX: string = "CPAP";

const AUCTION_ACCOUNT_PREFIX: string = "AAP";
const AUCTION_VAULT_PREFIX: string = "AVP";
const AUCTION_ROUND_ACCOUNT_PREFIX: string = "ARAP";

const USER_AUCTION_ACCOUNT_PREFIX: string = "UAAP";
const USER_AUCTION_ROUND_ACCOUNT_PREFIX: string = "UARAP";
const USER_AUCTION_BUY_RECEIPT_ACCOUNT_PREFIX: string = "UABRAP";
const USER_AUCTION_UNSOLD_DISTRIBUTION_ACCOUNT_PREFIX: string = "UAUDAP";

// Wallet Accounts
const mainSigningAuthorityPubKey: PublicKey = anchor.AnchorProvider.env().wallet.publicKey;
const feeAndRentPayerKeypair: Keypair = Keypair.generate();
const signingAuthorityKeypair: Keypair = Keypair.generate();
const backAuthorityKeypair: Keypair = Keypair.generate();
const mintAuthorityKeypair: Keypair = Keypair.generate();
const creatorKeypair: Keypair = Keypair.generate();
const feeReceiverKeypair: Keypair = Keypair.generate();
const paymentReceiverKeypair: Keypair = Keypair.generate();
const userAKeypair: Keypair = Keypair.generate();
const userBKeypair: Keypair = Keypair.generate();

const sellingTokenDecimal = 8;
const paymentTokenDecimal = 6;

let sellingTokenMintAccount: PublicKey;
let paymentTokenMintAccount: PublicKey;

const sellingTokenProgramAccount: PublicKey = TOKEN_PROGRAM_ID;
const paymentTokenProgramAccount: PublicKey = TOKEN_2022_PROGRAM_ID;

const padName = "one";

describe("cream-pad", () => {

    // const boost = calculateBoost(
    //     75,
    //     50,
    //     2,
    //     2,
    //     3
    // );
    //
    // console.log("boost: ", boost);
    //
    // const newPrice = calculatePrice(
    //     4,
    //     1.2,
    //     4,
    //     1,
    //     [boost],
    //     0,
    //     3
    // );
    //
    // console.log("new Price: ", newPrice)


    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.AnchorProvider.env());

    const program = anchor.workspace.CreamPad as Program<CreamPad>;

    const programId = program.programId;

    const delayTimeCount = 1000;

    let connection = anchor.AnchorProvider.env().connection;

    // Setup Events
    const initializePadEventListener = program.addEventListener(InitializePadEventName, handleInitializePadEvent);
    const updatePadEventListener = program.addEventListener(UpdatePadEventName, handleUpdatePadEvent);
    const endRoundEventListener = program.addEventListener(EndRoundEventName, handleEndRoundEvent);
    const startRoundEventListener = program.addEventListener(StartRoundEventName, handleStartRoundEvent);
    const lockAndDistributionEventListener = program.addEventListener(LockAndDistributionEventName, handleLockAndDistributionEvent);
    const unlockUnsoldSupplyEventListener = program.addEventListener(UnlockUnsoldSupplyEventName, handleUnlockUnsoldSupplyEvent);
    const buyEventListener = program.addEventListener(BuyEventName, handleBuyEvent);
    const claimDistributionEventListener = program.addEventListener(ClaimDistributionEventName, handleClaimDistributionEvent);

    it("setup signers accounts", async () => {
        console.log("Main Signing Authority Account: ", mainSigningAuthorityPubKey.toBase58());

        await connection.requestAirdrop(signingAuthorityKeypair.publicKey, 20 * LAMPORTS_PER_SOL);
        await delay(delayTimeCount);
        console.log("signing authority account: ", signingAuthorityKeypair.publicKey.toBase58());
        console.log("signing authority account sol balance: ", (await connection.getBalance(signingAuthorityKeypair.publicKey)) / LAMPORTS_PER_SOL);

        await connection.requestAirdrop(backAuthorityKeypair.publicKey, 20 * LAMPORTS_PER_SOL);
        await delay(delayTimeCount);
        console.log("back authority account: ", backAuthorityKeypair.publicKey.toBase58());
        console.log("back authority account sol balance: ", (await connection.getBalance(backAuthorityKeypair.publicKey)) / LAMPORTS_PER_SOL);

        await connection.requestAirdrop(feeAndRentPayerKeypair.publicKey, 20 * LAMPORTS_PER_SOL);
        await delay(delayTimeCount);
        console.log("fee and rent payer account: ", feeAndRentPayerKeypair.publicKey.toBase58());
        console.log("fee and rent payer account sol balance: ", (await connection.getBalance(feeAndRentPayerKeypair.publicKey)) / LAMPORTS_PER_SOL);

        await connection.requestAirdrop(mintAuthorityKeypair.publicKey, 20 * LAMPORTS_PER_SOL);
        await delay(delayTimeCount);
        console.log("mint authority account: ", mintAuthorityKeypair.publicKey.toBase58());
        console.log("mint authority account sol balance: ", (await connection.getBalance(mintAuthorityKeypair.publicKey)) / LAMPORTS_PER_SOL);

        await connection.requestAirdrop(creatorKeypair.publicKey, 20 * LAMPORTS_PER_SOL);
        await delay(delayTimeCount);
        console.log("creator account: ", creatorKeypair.publicKey.toBase58());
        console.log("creator account sol balance: ", (await connection.getBalance(creatorKeypair.publicKey)) / LAMPORTS_PER_SOL);

        await connection.requestAirdrop(feeReceiverKeypair.publicKey, 20 * LAMPORTS_PER_SOL);
        await delay(delayTimeCount);
        console.log("fee receiver account: ", feeReceiverKeypair.publicKey.toBase58());
        console.log("fee receiver account sol balance: ", (await connection.getBalance(feeReceiverKeypair.publicKey)) / LAMPORTS_PER_SOL);

        await connection.requestAirdrop(paymentReceiverKeypair.publicKey, 20 * LAMPORTS_PER_SOL);
        await delay(delayTimeCount);
        console.log("payment receiver account: ", paymentReceiverKeypair.publicKey.toBase58());
        console.log("payment receiver account sol balance: ", (await connection.getBalance(paymentReceiverKeypair.publicKey)) / LAMPORTS_PER_SOL);

        await connection.requestAirdrop(userAKeypair.publicKey, 20 * LAMPORTS_PER_SOL);
        await delay(delayTimeCount);
        console.log("user a account: ", userAKeypair.publicKey.toBase58());
        console.log("user a account sol balance: ", (await connection.getBalance(userAKeypair.publicKey)) / LAMPORTS_PER_SOL);

        await connection.requestAirdrop(userBKeypair.publicKey, 20 * LAMPORTS_PER_SOL);
        await delay(delayTimeCount);
        console.log("user b account: ", userBKeypair.publicKey.toBase58());
        console.log("user b account sol balance: ", (await connection.getBalance(userBKeypair.publicKey)) / LAMPORTS_PER_SOL);
    });

    it("create token mint account", async () => {
        sellingTokenMintAccount = await createMint(
            connection,
            feeAndRentPayerKeypair,
            mintAuthorityKeypair.publicKey,
            mintAuthorityKeypair.publicKey,
            sellingTokenDecimal,
            undefined,
            undefined,
            sellingTokenProgramAccount
        );
        console.log("selling token mint account: ", sellingTokenMintAccount.toBase58());
        await delay(delayTimeCount);

        paymentTokenMintAccount = await createMint(
            connection,
            feeAndRentPayerKeypair,
            mintAuthorityKeypair.publicKey,
            mintAuthorityKeypair.publicKey,
            paymentTokenDecimal,
            undefined,
            undefined,
            paymentTokenProgramAccount
        );
        console.log("payment token mint account: ", paymentTokenMintAccount.toBase58());
        await delay(delayTimeCount);

        // Mint Selling token to creator
        const creatorSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, creatorKeypair.publicKey, true, sellingTokenProgramAccount);

        await createAssociatedTokenAccount(
            connection, // connection
            feeAndRentPayerKeypair, // fee payer
            sellingTokenMintAccount, // mint
            creatorKeypair.publicKey, // owner,
            undefined,
            sellingTokenProgramAccount
        );
        console.log("create creator token account for selling token: ", creatorSellingTokenAccount.toBase58());
        await delay(delayTimeCount);

        let mintSellingTokenToCreatorTx = await mintToChecked(
            connection, // connection
            feeAndRentPayerKeypair, // fee payer
            sellingTokenMintAccount, // mint
            creatorSellingTokenAccount, // receiver (sholud be a token account)
            mintAuthorityKeypair, // mint authority
            tokensToLamports(1000, sellingTokenDecimal), // amount. if your decimals is 8, you mint 10^8 for 1 token.
            sellingTokenDecimal, // decimals,
            undefined,
            undefined,
            sellingTokenProgramAccount
        );
        console.log("mintSellingTokenToCreatorTx: ", mintSellingTokenToCreatorTx);
        await delay(delayTimeCount);

        await assertTokenBalance(connection, creatorSellingTokenAccount, 1000, "creator selling token balance", "creator selling token balance");

        // Mint payment token to user a
        const userAPaymentTokenAccount = await getAssociatedTokenAddress(paymentTokenMintAccount, userAKeypair.publicKey, true, paymentTokenProgramAccount);

        await createAssociatedTokenAccount(
            connection, // connection
            feeAndRentPayerKeypair, // fee payer
            paymentTokenMintAccount, // mint
            userAKeypair.publicKey, // owner,
            undefined,
            paymentTokenProgramAccount
        );
        console.log("create user a token account for payment token: ", userAPaymentTokenAccount.toBase58());
        await delay(delayTimeCount);

        let mintPaymentTokenToUserATx = await mintToChecked(
            connection, // connection
            feeAndRentPayerKeypair, // fee payer
            paymentTokenMintAccount, // mint
            userAPaymentTokenAccount, // receiver (sholud be a token account)
            mintAuthorityKeypair, // mint authority
            tokensToLamports(1000, paymentTokenDecimal), // amount. if your decimals is 8, you mint 10^8 for 1 token.
            paymentTokenDecimal, // decimals,
            undefined,
            undefined,
            paymentTokenProgramAccount
        );
        console.log("mintPaymentTokenToUserATx: ", mintPaymentTokenToUserATx);
        await delay(delayTimeCount);

        await assertTokenBalance(connection, userAPaymentTokenAccount, 1000, "user a payment token balance", "user a payment token balance");

        // Mint payment token to user b
        const userBPaymentTokenAccount = await getAssociatedTokenAddress(paymentTokenMintAccount, userBKeypair.publicKey, true, paymentTokenProgramAccount);

        await createAssociatedTokenAccount(
            connection, // connection
            feeAndRentPayerKeypair, // fee payer
            paymentTokenMintAccount, // mint
            userBKeypair.publicKey, // owner,
            undefined,
            paymentTokenProgramAccount
        );
        console.log("create user b token account for payment token: ", userBPaymentTokenAccount.toBase58());
        await delay(delayTimeCount);

        let mintPaymentTokenToUserBTx = await mintToChecked(
            connection, // connection
            feeAndRentPayerKeypair, // fee payer
            paymentTokenMintAccount, // mint
            userBPaymentTokenAccount, // receiver (sholud be a token account)
            mintAuthorityKeypair, // mint authority
            tokensToLamports(1000, paymentTokenDecimal), // amount. if your decimals is 8, you mint 10^8 for 1 token.
            paymentTokenDecimal, // decimals,
            undefined,
            undefined,
            paymentTokenProgramAccount
        );
        console.log("mintPaymentTokenToUserBTx: ", mintPaymentTokenToUserBTx);
        await delay(delayTimeCount);

        await assertTokenBalance(connection, userBPaymentTokenAccount, 1000, "user b payment token balance", "user b payment token balance");

    });

    it("initialize program config", async () => {

        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(programId, CREAM_PAD_ACCOUNT_PREFIX);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const tx = await program.methods.initialize({
            backAuthority: backAuthorityKeypair.publicKey,
            isBackAuthorityRequired: true,
            isFeeRequired: true,
            feeBasePoint: 100,
            feeReceiver: feeReceiverKeypair.publicKey,
            roundLimit: 100,
            distributionBasePoint: 5000,
            lockBasePoint: 5000,
            lockDuration: new BN(5)
        })
            .accounts({
                feeAndRentPayer: feeAndRentPayerKeypair.publicKey,
                signingAuthority: signingAuthorityKeypair.publicKey,
                creamPadConfig: creamPadConfigPda,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY
            })
            .signers([feeAndRentPayerKeypair, signingAuthorityKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        await assertCreamPadAccount(
            program,
            creamPadConfigPda,
            signingAuthorityKeypair.publicKey,
            backAuthorityKeypair.publicKey,
            true,
            ProgramStatus.Normal,
            true,
            100,
            feeReceiverKeypair.publicKey,
            100,
            5000,
            5000,
            new BN(5)
        );
    });

    it("update program config", async () => {

        const [creamPadConfigPda, creamPadConfigBump] = getCreamPadAccountPdaAndBump(programId, CREAM_PAD_ACCOUNT_PREFIX);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda] = getAuctionAccountPdaAndBump(programId, AUCTION_ACCOUNT_PREFIX, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());


        const tx = await program.methods.updateConfig({
            backAuthority: backAuthorityKeypair.publicKey,
            isBackAuthorityRequired: true,
            isFeeRequired: true,
            feeBasePoint: 2500,
            feeReceiver: feeReceiverKeypair.publicKey,
            roundLimit: 100,
            programStatus: ProgramStatus.Normal,
            distributionBasePoint: 5000,
            lockBasePoint: 5000,
            lockDuration: new BN(5),
            creamPadConfigBump: creamPadConfigBump
        })
            .accounts({
                signingAuthority: signingAuthorityKeypair.publicKey,
                creamPadConfig: creamPadConfigPda,
            })
            .signers([signingAuthorityKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        await assertCreamPadAccount(
            program,
            creamPadConfigPda,
            signingAuthorityKeypair.publicKey,
            backAuthorityKeypair.publicKey,
            true,
            ProgramStatus.Normal,
            true,
            2500,
            feeReceiverKeypair.publicKey,
            100,
            5000,
            5000,
            new BN(5)
        );
    });

    it("Initialize Pad Config", async () => {
        const roundIndex = "1";

        const [creamPadConfigPda, creamPadConfigBump] = getCreamPadAccountPdaAndBump(program.programId, CREAM_PAD_ACCOUNT_PREFIX);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda] = getAuctionAccountPdaAndBump(program.programId, AUCTION_ACCOUNT_PREFIX, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [auctionRoundConfigPda] = getAuctionRoundAccountPdaAndBump(programId, AUCTION_ROUND_ACCOUNT_PREFIX, auctionConfigPda, roundIndex);
        console.log("auctionRoundConfigPda: ", auctionRoundConfigPda.toBase58());

        const creatorSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, creatorKeypair.publicKey, true, sellingTokenProgramAccount);
        console.log("creatorSellingTokenAccount: ", creatorSellingTokenAccount.toBase58());

        const auctionConfigSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, auctionConfigPda, true, sellingTokenProgramAccount);
        console.log("auctionConfigSellingTokenAccount: ", auctionConfigSellingTokenAccount.toBase58());


        const tx = await program.methods.initializePad({
            paymentMint: paymentTokenMintAccount,
            paymentReceiver: paymentReceiverKeypair.publicKey,
            p0: new BN(tokensToLamports(4, 9).toString()),
            ptmax: new BN(tokensToLamports(1.2, 9).toString()),
            tmax: 2,
            omega: new BN(tokensToLamports(2, 9).toString()),
            alpha: new BN(tokensToLamports(2, 9).toString()),
            timeShiftMax: new BN(2),
            roundDuration: new BN(5),
            supply: new BN(tokensToLamports(200, 9).toString()),
            decayModel: DecayModel.Linear,
            padName: padName,
            creamPadConfigBump: creamPadConfigBump
        })
            .accounts({
                feeAndRentPayer: feeAndRentPayerKeypair.publicKey,
                backAuthority: backAuthorityKeypair.publicKey,
                creator: creatorKeypair.publicKey,
                creamPadConfig: creamPadConfigPda,
                auctionConfig: auctionConfigPda,
                auctionRoundConfig: auctionRoundConfigPda,
                tokenMintAccount: sellingTokenMintAccount,
                auctionConfigTokenAccount: auctionConfigSellingTokenAccount,
                creatorTokenAccount: creatorSellingTokenAccount,
                tokenProgram: sellingTokenProgramAccount,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY
            })
            .signers([feeAndRentPayerKeypair, backAuthorityKeypair, creatorKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        await assertAuctionAccount(
            program,
            auctionConfigPda,
            creatorKeypair.publicKey,
            sellingTokenMintAccount,
            paymentTokenMintAccount,
            paymentReceiverKeypair.publicKey,
            AuctionStatus.Started,
            new BN(tokensToLamports(4, 9).toString()),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            new BN(tokensToLamports(2, 9).toString()),
            new BN(tokensToLamports(2, 9).toString()),
            new BN(2),
            new BN(tokensToLamports(4, 9).toString()),
            1,
            [],
            DecayModel.Linear,
            new BN(tokensToLamports(200, 9).toString()),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0)
        );

        const auctionRoundData = await program.account.auctionRoundAccount.fetch(auctionRoundConfigPda);


        await assertAuctionRoundAccount(
            program,
            auctionRoundConfigPda,
            auctionRoundData.lastBlockTimestamp,
            auctionRoundData.lastBlockTimestamp.addn(5),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(tokensToLamports(4, 9).toString()),
            AuctionRoundStatus.Started,
            new BN(0),
            new BN(0),
            1,
            new BN(0),
        );

        await assertTokenBalance(connection, auctionConfigSellingTokenAccount, 200, "Auction Config Selling token account", "Auction Config Selling token account")
    });

    it("update Pad Config", async () => {
        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId, CREAM_PAD_ACCOUNT_PREFIX);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, AUCTION_ACCOUNT_PREFIX, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());


        const tx = await program.methods.updatePad({
            paymentReceiver: paymentReceiverKeypair.publicKey,
            padName: padName,
            auctionConfigBump: auctionConfigBump
        })
            .accounts({
                creator: creatorKeypair.publicKey,
                auctionConfig: auctionConfigPda,
                tokenMintAccount: sellingTokenMintAccount,
                instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY
            })
            .remainingAccounts([
                // index 0: Cream pad config
                {
                    pubkey: creamPadConfigPda,
                    isWritable: false,
                    isSigner: false
                },
                // index 0: back authority
                {
                    pubkey: backAuthorityKeypair.publicKey,
                    isWritable: false,
                    isSigner: true
                }
            ])
            .signers([creatorKeypair, backAuthorityKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        await assertAuctionAccount(
            program,
            auctionConfigPda,
            creatorKeypair.publicKey,
            sellingTokenMintAccount,
            paymentTokenMintAccount,
            paymentReceiverKeypair.publicKey,
            AuctionStatus.Started,
            new BN(tokensToLamports(4, 9).toString()),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            new BN(tokensToLamports(2, 9).toString()),
            new BN(tokensToLamports(2, 9).toString()),
            new BN(2),
            new BN(tokensToLamports(4, 9).toString()),
            1,
            [],
            DecayModel.Linear,
            new BN(tokensToLamports(200, 9).toString()),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0)
        );
    });

    it("Buy user a - 1", async () => {
        const roundIndex = "1";
        const userBuyIndex = "1";

        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId, CREAM_PAD_ACCOUNT_PREFIX);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, AUCTION_ACCOUNT_PREFIX, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [auctionRoundConfigPda, auctionRoundConfigBump] = getAuctionRoundAccountPdaAndBump(programId, AUCTION_ROUND_ACCOUNT_PREFIX, auctionConfigPda, roundIndex);
        console.log("auctionRoundConfigPda: ", auctionRoundConfigPda.toBase58());

        const auctionConfigSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, auctionConfigPda, true, sellingTokenProgramAccount);
        console.log("auctionConfigSellingTokenAccount: ", auctionConfigSellingTokenAccount.toBase58());

        const userSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, userAKeypair.publicKey, true, sellingTokenProgramAccount);
        console.log("userSellingTokenAccount: ", userSellingTokenAccount.toBase58());

        const userPaymentTokenAccount = await getAssociatedTokenAddress(paymentTokenMintAccount, userAKeypair.publicKey, true, paymentTokenProgramAccount);
        console.log("userPaymentTokenAccount: ", userPaymentTokenAccount.toBase58());

        const paymentReceiverPaymentTokenAccount = await getAssociatedTokenAddress(paymentTokenMintAccount, paymentReceiverKeypair.publicKey, true, paymentTokenProgramAccount);
        console.log("paymentReceiverPaymentTokenAccount: ", paymentReceiverPaymentTokenAccount.toBase58());

        const feeReceiverPaymentTokenAccount = await getAssociatedTokenAddress(paymentTokenMintAccount, feeReceiverKeypair.publicKey, true, paymentTokenProgramAccount);
        console.log("feeReceiverPaymentTokenAccount: ", feeReceiverPaymentTokenAccount.toBase58());

        const [userAuctionConfigPda] = getUserAuctionAccountPdaAndBump(programId, USER_AUCTION_ACCOUNT_PREFIX, auctionConfigPda, userAKeypair.publicKey);
        console.log("userAuctionConfigPda: ", userAuctionConfigPda.toBase58());

        const [userAuctionRoundConfigPda] = getUserAuctionRoundAccountPdaAndBump(programId, USER_AUCTION_ROUND_ACCOUNT_PREFIX, auctionRoundConfigPda, userAuctionConfigPda);
        console.log("userAuctionRoundConfigPda: ", userAuctionRoundConfigPda.toBase58());

        const [userAuctionBuyReceiptConfigPda] = getUserAuctionBuyReceiptAccountPdaAndBump(programId, USER_AUCTION_BUY_RECEIPT_ACCOUNT_PREFIX, userAuctionConfigPda, userBuyIndex);
        console.log("userAuctionBuyReceiptConfigPda: ", userAuctionBuyReceiptConfigPda.toBase58());

        const tx = await program.methods.buy({
            padName: padName,
            currentRoundIndex: roundIndex,
            buyIndex: userBuyIndex,
            amount: new BN(tokensToLamports(75, 9)),
            auctionConfigBump: auctionConfigBump,
            auctionRoundConfigBump: auctionRoundConfigBump
        })
            .accounts({
                feeAndRentPayer: feeAndRentPayerKeypair.publicKey,
                user: userAKeypair.publicKey,
                auctionConfig: auctionConfigPda,
                auctionRoundConfig: auctionRoundConfigPda,
                userAuctionConfig: userAuctionConfigPda,
                userAuctionRoundConfig: userAuctionRoundConfigPda,
                userAuctionBuyReceiptConfig: userAuctionBuyReceiptConfigPda,
                tokenMintAccount: sellingTokenMintAccount,
                paymentTokenMintAccount: paymentTokenMintAccount,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
                instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY
            })
            .remainingAccounts([
                // index 0: Cream pad config
                {
                    pubkey: creamPadConfigPda,
                    isWritable: false,
                    isSigner: false
                },
                // index 1: Back authority
                {
                    pubkey: backAuthorityKeypair.publicKey,
                    isWritable: false,
                    isSigner: true
                },
                // index 2: token program
                {
                    pubkey: sellingTokenProgramAccount,
                    isWritable: false,
                    isSigner: false
                },
                // index 3: payment token program
                {
                    pubkey: paymentTokenProgramAccount,
                    isWritable: false,
                    isSigner: false
                },
                // index 4: associated token program
                {
                    pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
                    isWritable: false,
                    isSigner: false
                },
                // index 5: user payment token program
                {
                    pubkey: userPaymentTokenAccount,
                    isWritable: true,
                    isSigner: false
                },
                // index 6: user token program
                {
                    pubkey: userSellingTokenAccount,
                    isWritable: true,
                    isSigner: false
                },
                // index 7: auction config token program
                {
                    pubkey: auctionConfigSellingTokenAccount,
                    isWritable: true,
                    isSigner: false
                },
                // index 8: payment receiver
                {
                    pubkey: paymentReceiverKeypair.publicKey,
                    isWritable: false,
                    isSigner: false
                },
                // index 9: payment receiver token account
                {
                    pubkey: paymentReceiverPaymentTokenAccount,
                    isWritable: true,
                    isSigner: false
                },
                // index 10: fee receiver
                {
                    pubkey: feeReceiverKeypair.publicKey,
                    isWritable: false,
                    isSigner: false
                },
                // index 11: fee receiver token account
                {
                    pubkey: feeReceiverPaymentTokenAccount,
                    isWritable: true,
                    isSigner: false
                },
            ])

            .signers([feeAndRentPayerKeypair, backAuthorityKeypair, userAKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        await assertAuctionAccount(
            program,
            auctionConfigPda,
            creatorKeypair.publicKey,
            sellingTokenMintAccount,
            paymentTokenMintAccount,
            paymentReceiverKeypair.publicKey,
            AuctionStatus.Started,
            new BN(tokensToLamports(4, 9).toString()),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            new BN(tokensToLamports(2, 9).toString()),
            new BN(tokensToLamports(2, 9).toString()),
            new BN(2),
            new BN(tokensToLamports(4, 9).toString()),
            1,
            [],
            DecayModel.Linear,
            new BN(tokensToLamports(200, 9).toString()),
            new BN(tokensToLamports(75, 9).toString()),
            new BN(1),
            new BN(1),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(tokensToLamports(300, 9).toString()),
            new BN(tokensToLamports(75, 9).toString())
        );

        const auctionRoundData = await program.account.auctionRoundAccount.fetch(auctionRoundConfigPda);


        await assertAuctionRoundAccount(
            program,
            auctionRoundConfigPda,
            auctionRoundData.roundStartAt,
            auctionRoundData.roundEndAt,
            new BN(tokensToLamports(75, 9).toString()),
            new BN(1),
            new BN(1),
            new BN(0),
            new BN(tokensToLamports(4, 9).toString()),
            AuctionRoundStatus.Started,
            new BN(tokensToLamports(300, 9).toString()),
            new BN(tokensToLamports(75, 9).toString()),
            1,
            new BN(0),
        );

        await assertUserAuctionAccount(
            program,
            userAuctionConfigPda,
            userAKeypair.publicKey,
            new BN(1),
            new BN(tokensToLamports(75, 9).toString()),
            new BN(tokensToLamports(300, 9).toString()),
            UserAuctionStatus.None
        );

        await assertUserAuctionRoundAccount(
            program,
            userAuctionRoundConfigPda,
            new BN(1),
            new BN(tokensToLamports(75, 9).toString()),
            new BN(tokensToLamports(300, 9).toString()),
            1
        );

        await assertUserAuctionBuyReceiptAccount(
            program,
            userAuctionBuyReceiptConfigPda,
            new BN(tokensToLamports(75, 9).toString()),
            new BN(tokensToLamports(300, 9).toString()),
            1,
            new BN(1)
        );

        await assertTokenBalance(connection, auctionConfigSellingTokenAccount, 125, "Auction Config Selling token account", "Auction Config Selling token account");

        await assertTokenBalance(connection, userSellingTokenAccount, 75, "User Selling token account", "User Selling token account");

        await assertTokenBalance(connection, userPaymentTokenAccount, 700, "User Payment token account", "User Payment token account");

        await assertTokenBalance(connection, paymentReceiverPaymentTokenAccount, 225, "Payment Receiver Payment token account", "Payment Receiver Payment token account");

        await assertTokenBalance(connection, feeReceiverPaymentTokenAccount, 75, "Fee Receiver Payment token account", "Fee Receiver Payment token account");
    });

    it("End Round 1", async () => {
        await delay(5000);

        const roundIndex = "1";

        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId, CREAM_PAD_ACCOUNT_PREFIX);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, AUCTION_ACCOUNT_PREFIX, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [auctionRoundConfigPda, auctionRoundConfigBump] = getAuctionRoundAccountPdaAndBump(programId, AUCTION_ROUND_ACCOUNT_PREFIX, auctionConfigPda, roundIndex);
        console.log("auctionRoundConfigPda: ", auctionRoundConfigPda.toBase58());


        const tx = await program.methods.endRound({
            padName: padName,
            roundIndex: roundIndex,
            auctionConfigBump: auctionConfigBump,
            auctionRoundConfigBump: auctionRoundConfigBump
        })
            .accounts({
                ender: creatorKeypair.publicKey,
                auctionConfig: auctionConfigPda,
                auctionRoundConfig: auctionRoundConfigPda,
                tokenMintAccount: sellingTokenMintAccount,
                instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY
            })
            .remainingAccounts([
                // index 0: Cream pad config
                {
                    pubkey: creamPadConfigPda,
                    isWritable: false,
                    isSigner: false
                },
                // index 0: back authority
                {
                    pubkey: backAuthorityKeypair.publicKey,
                    isWritable: false,
                    isSigner: true
                }
            ])
            .signers([backAuthorityKeypair, creatorKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        await assertAuctionAccount(
            program,
            auctionConfigPda,
            creatorKeypair.publicKey,
            sellingTokenMintAccount,
            paymentTokenMintAccount,
            paymentReceiverKeypair.publicKey,
            AuctionStatus.Started,
            new BN(tokensToLamports(4, 9).toString()),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            new BN(tokensToLamports(2, 9).toString()),
            new BN(tokensToLamports(2, 9).toString()),
            new BN(2),
            new BN(tokensToLamports(4, 9).toString()),
            1,
            [
                new BN(0)
            ],
            DecayModel.Linear,
            new BN(tokensToLamports(200, 9).toString()),
            new BN(tokensToLamports(75, 9).toString()),
            new BN(1),
            new BN(1),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(tokensToLamports(300, 9).toString()),
            new BN(tokensToLamports(75, 9).toString())
        );

        const auctionRoundData = await program.account.auctionRoundAccount.fetch(auctionRoundConfigPda);


        await assertAuctionRoundAccount(
            program,
            auctionRoundConfigPda,
            auctionRoundData.roundStartAt,
            auctionRoundData.roundEndAt,
            new BN(tokensToLamports(75, 9).toString()),
            new BN(1),
            new BN(1),
            new BN(0),
            new BN(tokensToLamports(4, 9).toString()),
            AuctionRoundStatus.Ended,
            new BN(tokensToLamports(300, 9).toString()),
            new BN(tokensToLamports(75, 9).toString()),
            1,
            auctionRoundData.roundEndedAt,
        );
    });

    it("Start Round 2", async () => {
        const previousRoundIndex = "1";
        const nextRoundIndex = "2";

        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId, CREAM_PAD_ACCOUNT_PREFIX);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, AUCTION_ACCOUNT_PREFIX, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [previousAuctionRoundConfigPda, previousAuctionRoundConfigBump] = getAuctionRoundAccountPdaAndBump(programId, AUCTION_ROUND_ACCOUNT_PREFIX, auctionConfigPda, previousRoundIndex);
        console.log("previousAuctionRoundConfigPda: ", previousAuctionRoundConfigPda.toBase58());

        const [nextAuctionRoundConfigPda] = getAuctionRoundAccountPdaAndBump(programId, AUCTION_ROUND_ACCOUNT_PREFIX, auctionConfigPda, nextRoundIndex);
        console.log("nextAuctionRoundConfigPda: ", nextAuctionRoundConfigPda.toBase58());

        const tx = await program.methods.startNextRound({
            padName: padName,
            previousRoundIndex: previousRoundIndex,
            nextRoundIndex: nextRoundIndex,
            nextRoundDuration: new BN(5),
            auctionConfigBump: auctionConfigBump,
            previousAuctionRoundConfigBump: previousAuctionRoundConfigBump
        })
            .accounts({
                feeAndRentPayer: feeAndRentPayerKeypair.publicKey,
                starter: creatorKeypair.publicKey,
                auctionConfig: auctionConfigPda,
                previousAuctionRoundConfig: previousAuctionRoundConfigPda,
                nextAuctionRoundConfig: nextAuctionRoundConfigPda,
                tokenMintAccount: sellingTokenMintAccount,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
                instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY
            })
            .remainingAccounts([
                // index 0: Cream pad config
                {
                    pubkey: creamPadConfigPda,
                    isWritable: false,
                    isSigner: false
                },
                // index 0: back authority
                {
                    pubkey: backAuthorityKeypair.publicKey,
                    isWritable: false,
                    isSigner: true
                }
            ])
            .signers([feeAndRentPayerKeypair, backAuthorityKeypair, creatorKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        await assertAuctionAccount(
            program,
            auctionConfigPda,
            creatorKeypair.publicKey,
            sellingTokenMintAccount,
            paymentTokenMintAccount,
            paymentReceiverKeypair.publicKey,
            AuctionStatus.Started,
            new BN(tokensToLamports(4, 9).toString()),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            new BN(tokensToLamports(2, 9).toString()),
            new BN(tokensToLamports(2, 9).toString()),
            new BN(2),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            [
                new BN(0),
            ],
            DecayModel.Linear,
            new BN(tokensToLamports(200, 9).toString()),
            new BN(tokensToLamports(75, 9).toString()),
            new BN(1),
            new BN(1),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(tokensToLamports(300, 9).toString()),
            new BN(tokensToLamports(75, 9).toString())
        );

        const auctionRoundData = await program.account.auctionRoundAccount.fetch(nextAuctionRoundConfigPda);


        await assertAuctionRoundAccount(
            program,
            nextAuctionRoundConfigPda,
            auctionRoundData.lastBlockTimestamp,
            auctionRoundData.lastBlockTimestamp.addn(5),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(tokensToLamports(1.2, 9).toString()),
            AuctionRoundStatus.Started,
            new BN(0),
            new BN(0),
            2,
            new BN(0)
        );
    });

    it("End Round 2", async () => {
        await delay(5000);

        const roundIndex = "2";

        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId, CREAM_PAD_ACCOUNT_PREFIX);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, AUCTION_ACCOUNT_PREFIX, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [auctionRoundConfigPda, auctionRoundConfigBump] = getAuctionRoundAccountPdaAndBump(programId, AUCTION_ROUND_ACCOUNT_PREFIX, auctionConfigPda, roundIndex);
        console.log("auctionRoundConfigPda: ", auctionRoundConfigPda.toBase58());


        const tx = await program.methods.endRound({
            padName: padName,
            roundIndex: roundIndex,
            auctionConfigBump: auctionConfigBump,
            auctionRoundConfigBump: auctionRoundConfigBump
        })
            .accounts({
                ender: creatorKeypair.publicKey,
                auctionConfig: auctionConfigPda,
                auctionRoundConfig: auctionRoundConfigPda,
                tokenMintAccount: sellingTokenMintAccount,
                instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY
            })
            .remainingAccounts([
                // index 0: Cream pad config
                {
                    pubkey: creamPadConfigPda,
                    isWritable: false,
                    isSigner: false
                },
                // index 0: back authority
                {
                    pubkey: backAuthorityKeypair.publicKey,
                    isWritable: false,
                    isSigner: true
                }
            ])
            .signers([backAuthorityKeypair, creatorKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        await assertAuctionAccount(
            program,
            auctionConfigPda,
            creatorKeypair.publicKey,
            sellingTokenMintAccount,
            paymentTokenMintAccount,
            paymentReceiverKeypair.publicKey,
            AuctionStatus.Ended,
            new BN(tokensToLamports(4, 9).toString()),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            new BN(tokensToLamports(2, 9).toString()),
            new BN(tokensToLamports(2, 9).toString()),
            new BN(2),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            [
                new BN(0),
                new BN(0)
            ],
            DecayModel.Linear,
            new BN(tokensToLamports(200, 9).toString()),
            new BN(tokensToLamports(75, 9).toString()),
            new BN(1),
            new BN(1),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(tokensToLamports(300, 9).toString()),
            new BN(tokensToLamports(75, 9).toString())
        );

        const auctionRoundData = await program.account.auctionRoundAccount.fetch(auctionRoundConfigPda);


        await assertAuctionRoundAccount(
            program,
            auctionRoundConfigPda,
            auctionRoundData.roundStartAt,
            auctionRoundData.roundEndAt,
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(0),
            new BN(tokensToLamports(1.2, 9).toString()),
            AuctionRoundStatus.Ended,
            new BN(0),
            new BN(0),
            2,
            auctionRoundData.roundEndedAt
        );
    });

    it("lock and distribute", async () => {
        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId, CREAM_PAD_ACCOUNT_PREFIX);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, AUCTION_ACCOUNT_PREFIX, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [auctionVaultConfigPda, auctionVaultConfigBump] = getAuctionVaultAccountPdaAndBump(programId, AUCTION_VAULT_PREFIX, auctionConfigPda);
        console.log("auctionVaultConfigPda: ", auctionVaultConfigPda.toBase58());

        const auctionConfigSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, auctionConfigPda, true, sellingTokenProgramAccount);
        console.log("auctionConfigSellingTokenAccount: ", auctionConfigSellingTokenAccount.toBase58());

        const auctionVaultConfigSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, auctionVaultConfigPda, true, sellingTokenProgramAccount);
        console.log("auctionVaultConfigSellingTokenAccount: ", auctionVaultConfigSellingTokenAccount.toBase58());

        const tx = await program.methods.lockAndDistribute({
            padName: padName,
            auctionConfigBump: auctionConfigBump,
            auctionVaultConfigBump: auctionVaultConfigBump,
        })
            .accounts({
                feeAndRentPayer: feeAndRentPayerKeypair.publicKey,
                supplyLocker: creatorKeypair.publicKey,
                auctionConfig: auctionConfigPda,
                auctionVaultConfig: auctionVaultConfigPda,
                tokenMintAccount: sellingTokenMintAccount,
                auctionConfigTokenAccount: auctionConfigSellingTokenAccount,
                auctionVaultConfigTokenAccount: auctionVaultConfigSellingTokenAccount,
                tokenProgram: sellingTokenProgramAccount,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
                instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY
            })
            .remainingAccounts([
                // index 0: Cream pad config
                {
                    pubkey: creamPadConfigPda,
                    isWritable: false,
                    isSigner: false
                },
                // index 0: back authority
                {
                    pubkey: backAuthorityKeypair.publicKey,
                    isWritable: false,
                    isSigner: true
                }
            ])
            .signers([feeAndRentPayerKeypair, backAuthorityKeypair, creatorKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        const auctionConfigData = await program.account.auctionAccount.fetch(auctionConfigPda);

        await assertAuctionAccount(
            program,
            auctionConfigPda,
            creatorKeypair.publicKey,
            sellingTokenMintAccount,
            paymentTokenMintAccount,
            paymentReceiverKeypair.publicKey,
            AuctionStatus.UnsoldLockedAndDistributionOpen,
            new BN(tokensToLamports(4, 9).toString()),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            new BN(tokensToLamports(2, 9).toString()),
            new BN(tokensToLamports(2, 9).toString()),
            new BN(2),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            [
                new BN(0),
                new BN(0)
            ],
            DecayModel.Linear,
            new BN(tokensToLamports(200, 9).toString()),
            new BN(tokensToLamports(75, 9).toString()),
            new BN(1),
            new BN(1),
            new BN(tokensToLamports(62.5, 9).toString()),
            auctionConfigData.lastBlockTimestamp,
            auctionConfigData.lastBlockTimestamp.addn(5),
            new BN(0),
            new BN(tokensToLamports(62.5, 9).toString()),
            new BN(0),
            new BN(0),
            new BN(tokensToLamports(300, 9).toString()),
            new BN(tokensToLamports(75, 9).toString())
        );

        await assertTokenBalance(connection, auctionConfigSellingTokenAccount, 62.5, "Auction Config Selling Token Account", "Auction Config Selling Token Account");

        await assertTokenBalance(connection, auctionVaultConfigSellingTokenAccount, 62.5, "Auction vault Config Selling Token Account", "Auction vault Config Selling Token Account");
    });

    it("unlock unsold supply", async () => {
        await delay(5000);

        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId, CREAM_PAD_ACCOUNT_PREFIX);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, AUCTION_ACCOUNT_PREFIX, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [auctionVaultConfigPda, auctionVaultConfigBump] = getAuctionVaultAccountPdaAndBump(programId, AUCTION_VAULT_PREFIX, auctionConfigPda);
        console.log("auctionVaultConfigPda: ", auctionVaultConfigPda.toBase58());

        const auctionVaultConfigSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, auctionVaultConfigPda, true, sellingTokenProgramAccount);
        console.log("auctionVaultConfigSellingTokenAccount: ", auctionVaultConfigSellingTokenAccount.toBase58());

        const creatorSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, creatorKeypair.publicKey, true, sellingTokenProgramAccount);
        console.log("creatorSellingTokenAccount: ", creatorSellingTokenAccount.toBase58());


        const tx = await program.methods.unlockUnsoldSupply({
            padName: padName,
            auctionConfigBump: auctionConfigBump,
            auctionVaultConfigBump: auctionVaultConfigBump,
        })
            .accounts({
                creator: creatorKeypair.publicKey,
                auctionConfig: auctionConfigPda,
                auctionVaultConfig: auctionVaultConfigPda,
                tokenMintAccount: sellingTokenMintAccount,
                auctionVaultConfigTokenAccount: auctionVaultConfigSellingTokenAccount,
                creatorTokenAccount: creatorSellingTokenAccount,
                tokenProgram: sellingTokenProgramAccount,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY
            })
            .remainingAccounts([
                // index 0: Cream pad config
                {
                    pubkey: creamPadConfigPda,
                    isWritable: false,
                    isSigner: false
                },
                // index 0: back authority
                {
                    pubkey: backAuthorityKeypair.publicKey,
                    isWritable: false,
                    isSigner: true
                }
            ])
            .signers([backAuthorityKeypair, creatorKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        const auctionConfigData = await program.account.auctionAccount.fetch(auctionConfigPda);

        await assertAuctionAccount(
            program,
            auctionConfigPda,
            creatorKeypair.publicKey,
            sellingTokenMintAccount,
            paymentTokenMintAccount,
            paymentReceiverKeypair.publicKey,
            AuctionStatus.UnsoldUnlocked,
            new BN(tokensToLamports(4, 9).toString()),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            new BN(tokensToLamports(2, 9).toString()),
            new BN(tokensToLamports(2, 9).toString()),
            new BN(2),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            [
                new BN(0),
                new BN(0)
            ],
            DecayModel.Linear,
            new BN(tokensToLamports(200, 9).toString()),
            new BN(tokensToLamports(75, 9).toString()),
            new BN(1),
            new BN(1),
            new BN(tokensToLamports(62.5, 9).toString()),
            auctionConfigData.unsoldSupplyLockedAt,
            auctionConfigData.unsoldSupplyCanUnlockAt,
            auctionConfigData.unsoldSupplyUnlockedAt,
            new BN(tokensToLamports(62.5, 9).toString()),
            new BN(0),
            new BN(0),
            new BN(tokensToLamports(300, 9).toString()),
            new BN(tokensToLamports(75, 9).toString())
        );

        await assertTokenBalance(connection, auctionVaultConfigSellingTokenAccount, 0, "Auction vault Config Selling Token Account", "Auction vault Config Selling Token Account");


        await assertTokenBalance(connection, creatorSellingTokenAccount, 862.5, "Creator Selling Token Account", "Creator Selling Token Account");
    });


    it("Buy user a - 1", async () => {
        const roundIndex = "1";
        const userBuyIndex = "1";

        const [creamPadConfigPda] = getCreamPadAccountPdaAndBump(program.programId, CREAM_PAD_ACCOUNT_PREFIX);
        console.log("creamPadConfigPda: ", creamPadConfigPda.toBase58());

        const [auctionConfigPda, auctionConfigBump] = getAuctionAccountPdaAndBump(program.programId, AUCTION_ACCOUNT_PREFIX, padName, sellingTokenMintAccount);
        console.log("auctionConfigPda: ", auctionConfigPda.toBase58());

        const [auctionRoundConfigPda, auctionRoundConfigBump] = getAuctionRoundAccountPdaAndBump(programId, AUCTION_ROUND_ACCOUNT_PREFIX, auctionConfigPda, roundIndex);
        console.log("auctionRoundConfigPda: ", auctionRoundConfigPda.toBase58());

        const auctionConfigSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, auctionConfigPda, true, sellingTokenProgramAccount);
        console.log("auctionConfigSellingTokenAccount: ", auctionConfigSellingTokenAccount.toBase58());

        const userSellingTokenAccount = await getAssociatedTokenAddress(sellingTokenMintAccount, userAKeypair.publicKey, true, sellingTokenProgramAccount);
        console.log("userSellingTokenAccount: ", userSellingTokenAccount.toBase58());

        const userPaymentTokenAccount = await getAssociatedTokenAddress(paymentTokenMintAccount, userAKeypair.publicKey, true, paymentTokenProgramAccount);
        console.log("userPaymentTokenAccount: ", userPaymentTokenAccount.toBase58());

        const paymentReceiverPaymentTokenAccount = await getAssociatedTokenAddress(paymentTokenMintAccount, paymentReceiverKeypair.publicKey, true, paymentTokenProgramAccount);
        console.log("paymentReceiverPaymentTokenAccount: ", paymentReceiverPaymentTokenAccount.toBase58());

        const feeReceiverPaymentTokenAccount = await getAssociatedTokenAddress(paymentTokenMintAccount, feeReceiverKeypair.publicKey, true, paymentTokenProgramAccount);
        console.log("feeReceiverPaymentTokenAccount: ", feeReceiverPaymentTokenAccount.toBase58());

        const [userAuctionConfigPda, userAuctionConfigBump] = getUserAuctionAccountPdaAndBump(programId, USER_AUCTION_ACCOUNT_PREFIX, auctionConfigPda, userAKeypair.publicKey);
        console.log("userAuctionConfigPda: ", userAuctionConfigPda.toBase58());


        const [userAuctionUnsoldDistributionConfigPda] = getUserAuctionUnsoldDistributionAccountPdaAndBump(programId, USER_AUCTION_UNSOLD_DISTRIBUTION_ACCOUNT_PREFIX, userAuctionConfigPda);
        console.log("userAuctionUnsoldDistributionConfigPda: ", userAuctionUnsoldDistributionConfigPda.toBase58());


        const tx = await program.methods.claimDistribution({
            padName: padName,
            auctionConfigBump: auctionConfigBump,
            userAuctionConfigBump: userAuctionConfigBump,
        })
            .accounts({
                feeAndRentPayer: feeAndRentPayerKeypair.publicKey,
                user: userAKeypair.publicKey,
                auctionConfig: auctionConfigPda,
                userAuctionConfig: userAuctionConfigPda,
                tokenMintAccount: sellingTokenMintAccount,
                tokenProgram: sellingTokenProgramAccount,
                userTokenAccount: userSellingTokenAccount,
                auctionConfigTokenAccount: auctionConfigSellingTokenAccount,
                userAuctionUnsoldDistributionConfig: userAuctionUnsoldDistributionConfigPda,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
                instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY
            })
            .remainingAccounts([
                // index 0: Cream pad config
                {
                    pubkey: creamPadConfigPda,
                    isWritable: false,
                    isSigner: false
                },
                // index 0: back authority
                {
                    pubkey: backAuthorityKeypair.publicKey,
                    isWritable: false,
                    isSigner: true
                }
            ])
            .signers([feeAndRentPayerKeypair, backAuthorityKeypair, userAKeypair])
            .rpc({
                skipPreflight: true
            });

        console.log("Your transaction signature", tx);

        await delay(delayTimeCount);

        const auctionConfigData = await program.account.auctionAccount.fetch(auctionConfigPda);

        await assertAuctionAccount(
            program,
            auctionConfigPda,
            creatorKeypair.publicKey,
            sellingTokenMintAccount,
            paymentTokenMintAccount,
            paymentReceiverKeypair.publicKey,
            AuctionStatus.UnsoldUnlocked,
            new BN(tokensToLamports(4, 9).toString()),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            new BN(tokensToLamports(2, 9).toString()),
            new BN(tokensToLamports(2, 9).toString()),
            new BN(2),
            new BN(tokensToLamports(1.2, 9).toString()),
            2,
            [
                new BN(0),
                new BN(0)
            ],
            DecayModel.Linear,
            new BN(tokensToLamports(200, 9).toString()),
            new BN(tokensToLamports(75, 9).toString()),
            new BN(1),
            new BN(1),
            new BN(tokensToLamports(62.5, 9).toString()),
            auctionConfigData.unsoldSupplyLockedAt,
            auctionConfigData.unsoldSupplyCanUnlockAt,
            auctionConfigData.unsoldSupplyUnlockedAt,
            new BN(tokensToLamports(62.5, 9).toString()),
            new BN(tokensToLamports(62.5, 9).toString()),
            new BN(1),
            new BN(tokensToLamports(300, 9).toString()),
            new BN(tokensToLamports(75, 9).toString())
        );


        await assertUserAuctionUnsoldDistributionAccount(
            program,
            userAuctionUnsoldDistributionConfigPda,
            new BN(tokensToLamports(62.5, 9).toString())
        );

        await assertTokenBalance(connection, auctionConfigSellingTokenAccount, 0, "Auction Config Selling Token Account", "Auction Config Selling Token Account");

        await assertTokenBalance(connection, userSellingTokenAccount, 137.5, "User Selling Token Account", "User Selling Token Account");
    });

    it("Remove Events", async () => {
        await delay(delayTimeCount);

        await program.removeEventListener(initializePadEventListener);
        await program.removeEventListener(updatePadEventListener);
        await program.removeEventListener(endRoundEventListener);
        await program.removeEventListener(startRoundEventListener);
        await program.removeEventListener(lockAndDistributionEventListener);
        await program.removeEventListener(unlockUnsoldSupplyEventListener);
        await program.removeEventListener(buyEventListener);
        await program.removeEventListener(claimDistributionEventListener);
    });
});

/// Helper
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

////// PDAs

function getCreamPadAccountPdaAndBump(programAddress: PublicKey, prefix: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(prefix)],
        programAddress
    )
}

function getAuctionAccountPdaAndBump(programAddress: PublicKey, prefix: string, padName: string, tokenMintAccount: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            Buffer.from(padName),
            tokenMintAccount.toBuffer()
        ],
        programAddress
    )
}

function getAuctionVaultAccountPdaAndBump(programAddress: PublicKey, prefix: string, auctionConfig: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            auctionConfig.toBuffer(),
        ],
        programAddress
    )
}

function getAuctionRoundAccountPdaAndBump(programAddress: PublicKey, prefix: string, auctionConfig: PublicKey, auctionRoundIndex: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            auctionConfig.toBuffer(),
            Buffer.from(auctionRoundIndex),
        ],
        programAddress
    )
}


function getUserAuctionAccountPdaAndBump(programAddress: PublicKey, prefix: string, auctionConfig: PublicKey, user: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            auctionConfig.toBuffer(),
            user.toBuffer(),
        ],
        programAddress
    )
}

function getUserAuctionRoundAccountPdaAndBump(programAddress: PublicKey, prefix: string, auctionRoundConfig: PublicKey, userAuctionConfig: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            auctionRoundConfig.toBuffer(),
            userAuctionConfig.toBuffer(),
        ],
        programAddress
    )
}

function getUserAuctionBuyReceiptAccountPdaAndBump(programAddress: PublicKey, prefix: string, userAuctionConfig: PublicKey, userBuyIndex: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            userAuctionConfig.toBuffer(),
            Buffer.from(userBuyIndex),
        ],
        programAddress
    )
}

function getUserAuctionUnsoldDistributionAccountPdaAndBump(programAddress: PublicKey, prefix: string, userAuctionConfig: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(prefix),
            userAuctionConfig.toBuffer(),
        ],
        programAddress
    )
}

///// Assert
async function assertTokenBalance(connection: Connection, ata: PublicKey, balance: number, message: string, assertMessage: string) {

    const ataBalance = await connection.getTokenAccountBalance(ata);

    console.log(message);
    console.log(ataBalance);

    assert(ataBalance.value.uiAmount === balance, assertMessage);
}

async function assertCreamPadAccount(program: Program<CreamPad>, pdaAddress: PublicKey, signingAuthority: PublicKey, backAuthority: PublicKey, isBackAuthorityRequired: boolean, programStatus: ProgramStatusType, isFeeRequired: boolean, feeBasePoint: number, feeReceiver: PublicKey, roundLimit: number, distributionBasePoint: number, lockBasePoint: number, lockDuration: BN) {
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
}

async function assertAuctionAccount(
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

async function assertAuctionRoundAccount(
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
    roundEndedAt: BN
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
}

async function assertUserAuctionAccount(
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

async function assertUserAuctionRoundAccount(
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

async function assertUserAuctionBuyReceiptAccount(
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

async function assertUserAuctionUnsoldDistributionAccount(
    program: Program<CreamPad>,
    pdaAddress: PublicKey,
    amount: BN
) {
    const data = await program.account.userAuctionUnsoldDistributionAccount.fetch(pdaAddress);

    console.log("User auction unsold distribution account: >>>>>>>> ", data);

    assert(data.amount.toNumber() === amount.toNumber(), "User Auction Unsold Distribution -> amount");
}


///// MATH

function calculateBoost(
    actualSales: number,
    expectedSales: number,
    omega: number,
    alpha: number,
    timeShiftMax: number
): number {
    if (expectedSales === 0) return 0; // Prevent division by zero
    const ratio = Math.floor((actualSales * omega) / expectedSales);
    return Math.min(alpha * ratio, timeShiftMax);
}

function calculatePrice(
    p0: number,
    ptmax: number,
    tMax: number,
    currentRound: number,
    boostHistory: number[],
    decayModel: number,
    timeShiftMax: number
): number {
    let totalBoost = 0;

    // ✅ Fix: Correctly apply boost by shifting the time effect
    for (let i = 0; i < currentRound; i++) {
        totalBoost += 1 - Math.min(boostHistory[i] || 0, timeShiftMax);
    }

    if (decayModel === 0) { // Linear decay
        const k0 = (p0 - ptmax) / (tMax - 1); // ✅ Fix: Use `tMax - 1` instead of `tMax`
        return Math.max(p0 - k0 * totalBoost, ptmax);
    } else { // Exponential decay
        if (p0 <= ptmax) return ptmax; // Prevent log errors

        const lambda0 = (Math.log(p0) - Math.log(ptmax)) / (tMax - 1);
        return Math.max(p0 * Math.exp(-lambda0 * totalBoost), ptmax);
    }
}

function adjustAmount(amount: number, fromDecimals: number, toDecimals: number): number {
    const factor = Math.pow(10, Math.abs(toDecimals - fromDecimals));

    return toDecimals > fromDecimals
        ? amount * factor
        : Math.floor(amount / factor); // Use floor to avoid floating-point precision errors
}

function calculateTotalPrice(
    amount: number,
    price: number,
    fromDecimals: number,
    toDecimals: number,
    outputDecimals: number
): number {
    const adjustedAmount = adjustAmount(amount, fromDecimals, toDecimals);
    const totalPrice = BigInt(adjustedAmount) * BigInt(price);
    const divisor = BigInt(Math.pow(10, outputDecimals));

    return Number(totalPrice / divisor);
}

function lamportsToTokens(lamports: number, mintDecimals: number): number {
    return lamports / 10 ** mintDecimals;
}

// console.log(lamportsToTokens(2500000000n, 9)); // 2.5 tokens

function tokensToLamports(amount: number, mintDecimals: number): number {
    return amount * (10 ** mintDecimals);
}

// console.log(tokensToLamports(2.5, 9)); // 2500000000 lamports (2.5 tokens with 9 decimals)


