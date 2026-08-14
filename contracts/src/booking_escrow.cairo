//! Booking escrow for Philoxenia — trustless settlement with 0% protocol fee.
//!
//! Guest funds escrow; on settlement host and connector receive their shares.

use starknet::ContractAddress;

#[derive(Drop, Serde, starknet::Store)]
pub struct Booking {
    pub booking_id: u256,
    pub listing_id: u256,
    pub host: ContractAddress,
    pub guest: ContractAddress,
    pub connector: ContractAddress,
    pub total_amount: u256,
    pub host_amount: u256,
    pub connector_amount: u256,
    pub connector_reward_bps: u16,
    pub funded: bool,
    pub settled: bool,
    pub refunded: bool,
}

#[starknet::interface]
pub trait IBookingEscrow<TContractState> {
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
    fn refund_booking(ref self: TContractState, booking_id: u256);
    fn get_booking(self: @TContractState, booking_id: u256) -> Booking;
}

#[starknet::contract]
pub mod BookingEscrow {
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use super::Booking;

    #[storage]
    struct Storage {
        token: ContractAddress,
        owner: ContractAddress,
        bookings: Map<u256, Booking>,
        booking_count: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        BookingCreated: BookingCreated,
        BookingFunded: BookingFunded,
        BookingSettled: BookingSettled,
        BookingRefunded: BookingRefunded,
    }

    #[derive(Drop, starknet::Event)]
    struct BookingCreated {
        booking_id: u256,
        host: ContractAddress,
        guest: ContractAddress,
        connector: ContractAddress,
        total_amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct BookingFunded {
        booking_id: u256,
        guest: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct BookingSettled {
        booking_id: u256,
        host: ContractAddress,
        connector: ContractAddress,
        host_amount: u256,
        connector_amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct BookingRefunded {
        booking_id: u256,
        guest: ContractAddress,
        amount: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, token: ContractAddress, owner: ContractAddress) {
        self.token.write(token);
        self.owner.write(owner);
        self.booking_count.write(0);
    }

    #[abi(embed_v0)]
    impl BookingEscrowImpl of super::IBookingEscrow<ContractState> {
        fn create_booking(
            ref self: ContractState,
            booking_id: u256,
            listing_id: u256,
            host: ContractAddress,
            guest: ContractAddress,
            connector: ContractAddress,
            total_amount: u256,
            connector_reward_bps: u16,
        ) {
            assert(get_caller_address() == self.owner.read(), 'Only owner');
            assert(total_amount > 0, 'Invalid amount');
            assert(connector_reward_bps <= 10000, 'Invalid reward bps');

            let existing = self.bookings.read(booking_id);
            assert(!existing.funded && existing.total_amount == 0, 'Booking exists');

            let connector_amount = total_amount * connector_reward_bps.into() / 10000_u256;
            let host_amount = total_amount - connector_amount;

            let booking = Booking {
                booking_id,
                listing_id,
                host,
                guest,
                connector,
                total_amount,
                host_amount,
                connector_amount,
                connector_reward_bps,
                funded: false,
                settled: false,
                refunded: false,
            };

            self.bookings.write(booking_id, booking);
            self.booking_count.write(self.booking_count.read() + 1);

            self
                .emit(
                    Event::BookingCreated(
                        BookingCreated {
                            booking_id,
                            host,
                            guest,
                            connector,
                            total_amount,
                        },
                    ),
                );
        }

        fn fund_booking(ref self: ContractState, booking_id: u256) {
            let caller = get_caller_address();
            let mut booking = self.bookings.read(booking_id);

            assert(booking.total_amount > 0, 'Booking not found');
            assert(!booking.funded, 'Already funded');
            assert(!booking.settled, 'Already settled');
            assert(!booking.refunded, 'Already refunded');
            assert(caller == booking.guest, 'Only guest');

            let token = IERC20Dispatcher { contract_address: self.token.read() };
            let escrow = get_contract_address();
            let amount = booking.total_amount;
            token.transfer_from(caller, escrow, amount);

            booking.funded = true;
            self.bookings.write(booking_id, booking);

            self
                .emit(
                    Event::BookingFunded(
                        BookingFunded {
                            booking_id,
                            guest: caller,
                            amount,
                        },
                    ),
                );
        }

        fn settle_booking(ref self: ContractState, booking_id: u256) {
            let caller = get_caller_address();
            let mut booking = self.bookings.read(booking_id);

            assert(booking.funded, 'Not funded');
            assert(!booking.settled, 'Already settled');
            assert(!booking.refunded, 'Already refunded');
            assert(caller == booking.guest || caller == self.owner.read(), 'Unauthorized');

            let token = IERC20Dispatcher { contract_address: self.token.read() };

            if booking.host_amount > 0 {
                token.transfer(booking.host, booking.host_amount);
            }
            if booking.connector_amount > 0 {
                token.transfer(booking.connector, booking.connector_amount);
            }

            let host = booking.host;
            let connector = booking.connector;
            let host_amount = booking.host_amount;
            let connector_amount = booking.connector_amount;

            booking.settled = true;
            self.bookings.write(booking_id, booking);

            self
                .emit(
                    Event::BookingSettled(
                        BookingSettled {
                            booking_id,
                            host,
                            connector,
                            host_amount,
                            connector_amount,
                        },
                    ),
                );
        }

        fn refund_booking(ref self: ContractState, booking_id: u256) {
            let caller = get_caller_address();
            let mut booking = self.bookings.read(booking_id);

            assert(booking.funded, 'Not funded');
            assert(!booking.settled, 'Already settled');
            assert(!booking.refunded, 'Already refunded');
            assert(caller == booking.host || caller == self.owner.read(), 'Unauthorized');

            let token = IERC20Dispatcher { contract_address: self.token.read() };
            let guest = booking.guest;
            let amount = booking.total_amount;
            token.transfer(guest, amount);

            booking.refunded = true;
            self.bookings.write(booking_id, booking);

            self
                .emit(
                    Event::BookingRefunded(
                        BookingRefunded {
                            booking_id,
                            guest,
                            amount,
                        },
                    ),
                );
        }

        fn get_booking(self: @ContractState, booking_id: u256) -> Booking {
            self.bookings.read(booking_id)
        }
    }
}
