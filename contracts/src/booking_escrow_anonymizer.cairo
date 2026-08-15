//! STRK20 BookingEscrow anonymizer (privacy_invoke helper).
//!
//! Pool withdraws ERC-20 here, then calls `privacy_invoke`. This helper
//! create/fund/settle on BookingEscrow so observers see pool↔helper, not the
//! guest wallet as the escrow payer.
//!
//! Layout of `OpenNoteDeposit` matches starkware-libs/starknet-privacy
//! `privacy::objects::OpenNoteDeposit` (note_id, token, amount u128).

use starknet::ContractAddress;

/// Must match the privacy pool’s expected open-note deposit ABI.
#[derive(Serde, Drop, Copy)]
pub struct OpenNoteDeposit {
    pub note_id: felt252,
    pub token: ContractAddress,
    pub amount: u128,
}

#[starknet::interface]
pub trait IBookingEscrowAnonymizer<TContractState> {
    /// Called by the privacy pool after it transfers `total_amount` of the
    /// escrow’s token to this contract.
    fn privacy_invoke(
        ref self: TContractState,
        escrow: ContractAddress,
        token: ContractAddress,
        booking_id: u256,
        listing_id: u256,
        host: ContractAddress,
        guest: ContractAddress,
        connector: ContractAddress,
        total_amount: u256,
        connector_reward_bps: u16,
        note_id: felt252,
    ) -> Span<OpenNoteDeposit>;
}

#[starknet::interface]
pub trait IBookingEscrowMinimal<TContractState> {
    fn create_booking(
        ref self: TContractState,
        booking_id: u256,
        listing_id: u256,
        host: ContractAddress,
        guest: ContractAddress,
        connector: ContractAddress,
        total_amount: u256,
        connector_reward_bps: u16,
    );
    fn fund_booking(ref self: TContractState, booking_id: u256);
    fn settle_booking(ref self: TContractState, booking_id: u256);
}

#[starknet::contract]
pub mod BookingEscrowAnonymizer {
    use core::num::traits::Zero;
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use super::{
        IBookingEscrowAnonymizer, IBookingEscrowMinimalDispatcher,
        IBookingEscrowMinimalDispatcherTrait, OpenNoteDeposit,
    };

    #[storage]
    struct Storage {}

    #[constructor]
    fn constructor(ref self: ContractState) {}

    #[abi(embed_v0)]
    impl BookingEscrowAnonymizerImpl of IBookingEscrowAnonymizer<ContractState> {
        fn privacy_invoke(
            ref self: ContractState,
            escrow: ContractAddress,
            token: ContractAddress,
            booking_id: u256,
            listing_id: u256,
            host: ContractAddress,
            guest: ContractAddress,
            connector: ContractAddress,
            total_amount: u256,
            connector_reward_bps: u16,
            note_id: felt252,
        ) -> Span<OpenNoteDeposit> {
            assert(!escrow.is_zero(), 'ZERO_ESCROW');
            assert(!token.is_zero(), 'ZERO_TOKEN');
            assert(total_amount > 0, 'ZERO_AMOUNT');
            assert(!host.is_zero(), 'ZERO_HOST');
            assert(!guest.is_zero(), 'ZERO_GUEST');

            let self_addr = get_contract_address();
            let privacy_addr = get_caller_address();
            let erc20 = IERC20Dispatcher { contract_address: token };

            let balance = erc20.balance_of(self_addr);
            assert(balance >= total_amount, 'INSUFFICIENT_BALANCE');

            // Approve escrow to pull payment, then create → fund → settle.
            erc20.approve(escrow, total_amount);
            let escrow_d = IBookingEscrowMinimalDispatcher { contract_address: escrow };
            escrow_d
                .create_booking(
                    booking_id,
                    listing_id,
                    host,
                    guest,
                    connector,
                    total_amount,
                    connector_reward_bps,
                );
            escrow_d.fund_booking(booking_id);
            escrow_d.settle_booking(booking_id);

            // Any leftover (should be none after settle) → open note for the user.
            let leftover = erc20.balance_of(self_addr);
            if leftover.is_zero() {
                return array![].span();
            }

            let out_amount: u128 = leftover.try_into().expect('LEFTOVER_OVERFLOW');
            erc20.approve(privacy_addr, leftover);
            // note_id kept for ABI compatibility even if unused when empty surplus
            let _ = note_id;
            array![
                OpenNoteDeposit { note_id, token, amount: out_amount },
            ]
                .span()
        }
    }
}
