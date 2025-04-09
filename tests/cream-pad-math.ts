
///// MATH

export function calculateBoost(
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

export function calculatePrice(
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

export function adjustAmount(amount: number, fromDecimals: number, toDecimals: number): number {
    const factor = Math.pow(10, Math.abs(toDecimals - fromDecimals));

    return toDecimals > fromDecimals
        ? amount * factor
        : Math.floor(amount / factor); // Use floor to avoid floating-point precision errors
}

export function calculateTotalPrice(
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

export function lamportsToTokens(lamports: number, mintDecimals: number): number {
    return lamports / 10 ** mintDecimals;
}

// console.log(lamportsToTokens(2500000000n, 9)); // 2.5 tokens

export function tokensToLamports(amount: number, mintDecimals: number): number {
    return amount * (10 ** mintDecimals);
}

// console.log(tokensToLamports(2.5, 9)); // 2500000000 lamports (2.5 tokens with 9 decimals)