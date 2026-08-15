use philoxenia_contracts::booking_escrow::{
    IBookingEscrowDispatcher, IBookingEscrowDispatcherTrait,
};
use snforge_std::{
    declare, start_cheat_caller_address, stop_cheat_caller_address, ContractClassTrait,
    DeclareResultTrait,
};
use starknet::ContractAddress;

fn owner() -> ContractAddress {
    'owner'.try_into().unwrap()
}

fn treasury() -> ContractAddress {
    'treasury'.try_into().unwrap()
}

fn host() -> ContractAddress {
    'host'.try_into().unwrap()
}

fn guest() -> ContractAddress {
    'guest'.try_into().unwrap()
}

fn connector() -> ContractAddress {
    'connector'.try_into().unwrap()
}

fn token() -> ContractAddress {
    'token'.try_into().unwrap()
}

fn zero() -> ContractAddress {
    0.try_into().unwrap()
}

fn deploy_escrow() -> ContractAddress {
    let contract = declare("BookingEscrow").unwrap().contract_class();
    let mut calldata = array![token().into(), owner().into(), treasury().into()];
    let (escrow, _) = contract.deploy(@calldata).unwrap();
    escrow
}

#[test]
fn test_connector_reward_with_protocol_take() {
    let escrow = deploy_escrow();
    start_cheat_caller_address(escrow, owner());

    let booking_id: u256 = 1;
    // 750 STRK, 5% connector reward → gross 37.5; protocol 10% of that = 3.75; connector 33.75
    let total: u256 = 750_000000000000000000;
    let reward_bps: u16 = 500;

    IBookingEscrowDispatcher { contract_address: escrow }
        .create_booking(booking_id, 100, host(), guest(), connector(), total, reward_bps);

    let booking = IBookingEscrowDispatcher { contract_address: escrow }.get_booking(booking_id);

    assert(booking.host_amount == 712_500000000000000000, 'Host amount');
    assert(booking.connector_amount == 33_750000000000000000, 'Connector net');
    assert(booking.protocol_amount == 3_750000000000000000, 'Protocol take');
    assert(
        IBookingEscrowDispatcher { contract_address: escrow }.get_protocol_take_bps() == 1000,
        'Protocol bps',
    );

    stop_cheat_caller_address(escrow);
}

#[test]
fn test_optional_connector_direct_booking() {
    let escrow = deploy_escrow();
    start_cheat_caller_address(escrow, guest());

    let booking_id: u256 = 2;
    let total: u256 = 750_000000000000000000;

    IBookingEscrowDispatcher { contract_address: escrow }
        .create_booking(booking_id, 100, host(), guest(), zero(), total, 0);

    let booking = IBookingEscrowDispatcher { contract_address: escrow }.get_booking(booking_id);

    assert(booking.host_amount == total, 'Host gets all');
    assert(booking.connector_amount == 0, 'No connector');
    assert(booking.protocol_amount == 0, 'No protocol fee');
    assert(booking.connector_reward_bps == 0, 'Zero reward %');

    stop_cheat_caller_address(escrow);
}
