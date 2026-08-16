//! STRK20 MessageMailbox — privacy_invoke helper for sealed message payloads.
//!
//! The privacy pool calls `privacy_invoke` (pool is msg.sender). This helper
//! appends an encrypted payload commitment for a channel and emits an event.
//! It does not modify the pool contract.
//!
//! Phase A: storage + events. Phase B: wire Ready invoke from the web app.
//! Full RFP discovery via viewing keys is Phase C (SDK / Wallet API).

use starknet::ContractAddress;

#[derive(Serde, Drop, Copy)]
pub struct OpenNoteDeposit {
    pub note_id: felt252,
    pub token: ContractAddress,
    pub amount: u128,
}

#[starknet::interface]
pub trait IMessageMailbox<TContractState> {
    /// Called by the privacy pool. Stores sealed payload metadata and emits
    /// `MessagePosted`. Returns an empty open-note span (no token leftover).
    fn privacy_invoke(
        ref self: TContractState,
        channel_id: felt252,
        payload_hash: felt252,
        chunk_count: u32,
        note_id: felt252,
    ) -> Span<OpenNoteDeposit>;

    fn message_count(self: @TContractState) -> u64;
    fn message_channel(self: @TContractState, message_id: u64) -> felt252;
    fn message_payload_hash(self: @TContractState, message_id: u64) -> felt252;
}

#[starknet::contract]
pub mod MessageMailbox {
    use core::num::traits::Zero;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{get_block_timestamp, get_caller_address};
    use super::{IMessageMailbox, OpenNoteDeposit};

    #[storage]
    struct Storage {
        message_count: u64,
        channels: Map<u64, felt252>,
        payload_hashes: Map<u64, felt252>,
        chunk_counts: Map<u64, u32>,
        /// Optional allowlist: zero = any caller (tests); set to pool in prod.
        privacy_pool: starknet::ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        MessagePosted: MessagePosted,
    }

    #[derive(Drop, starknet::Event)]
    struct MessagePosted {
        #[key]
        message_id: u64,
        #[key]
        channel_id: felt252,
        payload_hash: felt252,
        chunk_count: u32,
        timestamp: u64,
    }

    #[constructor]
    fn constructor(ref self: ContractState, privacy_pool: starknet::ContractAddress) {
        self.privacy_pool.write(privacy_pool);
        self.message_count.write(0);
    }

    #[abi(embed_v0)]
    impl MessageMailboxImpl of IMessageMailbox<ContractState> {
        fn privacy_invoke(
            ref self: ContractState,
            channel_id: felt252,
            payload_hash: felt252,
            chunk_count: u32,
            note_id: felt252,
        ) -> Span<OpenNoteDeposit> {
            assert(channel_id != 0, 'ZERO_CHANNEL');
            assert(payload_hash != 0, 'ZERO_HASH');
            assert(chunk_count > 0, 'ZERO_CHUNKS');

            let pool = self.privacy_pool.read();
            if !pool.is_zero() {
                assert(get_caller_address() == pool, 'NOT_PRIVACY_POOL');
            }

            let id = self.message_count.read() + 1;
            self.message_count.write(id);
            self.channels.write(id, channel_id);
            self.payload_hashes.write(id, payload_hash);
            self.chunk_counts.write(id, chunk_count);

            self
                .emit(
                    MessagePosted {
                        message_id: id,
                        channel_id,
                        payload_hash,
                        chunk_count,
                        timestamp: get_block_timestamp(),
                    },
                );

            let _ = note_id;
            array![].span()
        }

        fn message_count(self: @ContractState) -> u64 {
            self.message_count.read()
        }

        fn message_channel(self: @ContractState, message_id: u64) -> felt252 {
            self.channels.read(message_id)
        }

        fn message_payload_hash(self: @ContractState, message_id: u64) -> felt252 {
            self.payload_hashes.read(message_id)
        }
    }
}
