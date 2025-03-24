import * as anchor from "@coral-xyz/anchor";
import {BN, Program} from "@coral-xyz/anchor";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createMint,
  getAssociatedTokenAddress,
  mintToChecked,
  TOKEN_PROGRAM_ID,
  getMint
} from '@solana/spl-token';
import {assert} from "chai";
import { CreamPad } from "../target/types/cream_pad";

describe("cream-pad", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.CreamPad as Program<CreamPad>;

  it("Is initialized!", async () => {
    // Add your test here.

    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRveSonicConfigAccountPdaAndBump(programAddress: PublicKey, prefix: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
      [Buffer.from(prefix)],
      programAddress
  )
}

///// Assert



///// MATH
function calculateBoost(
    actualSales: number,
    expectedSales: number,
    Omega: number,
    Alpha: number,
    TimeShiftMax: number
): number {
  if (actualSales >= expectedSales) {
    return Math.min(Alpha * Omega * (actualSales / expectedSales), TimeShiftMax);
  }
  return 0; // No boost if sales are below target
}

function calculatePrice(
    P0: number,
    PtMax: number,
    TMax: number,
    currentRound: number,
    boostHistory: number[],
    decayModel: number,
    TimeShiftMax: number
): number {
  let totalBoost = 0;
  for (let i = 0; i < currentRound; i++) {
    totalBoost += 1 - Math.min(boostHistory[i], TimeShiftMax);
  }

  if (decayModel === 0) {
    const k0 = (P0 - PtMax) / TMax;
    return Math.max(P0 - k0 * totalBoost, PtMax);
  } else {
    const lambda0 = (Math.log(P0) - Math.log(PtMax)) / TMax;
    return Math.max(P0 * Math.exp(-lambda0 * totalBoost), PtMax);
  }
}
