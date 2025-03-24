#![allow(missing_docs)]

#[cfg(not(feature = "no-entrypoint"))]
use solana_security_txt::security_txt;

#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    name: "Cream Pad Program",
    project_url: "https://creampad.game",
    contacts: "email:security@creampad.game",
    policy: "https://github.com/bilalafzal97/cream-pad-program-library/blob/main/SECURITY.md"
}
