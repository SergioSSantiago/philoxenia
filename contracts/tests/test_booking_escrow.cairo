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

#[test]
fn test_reward_calculation() {
    let contract = declare("BookingEscrow").unwrap().contract_class();
    let mut calldata = array![token().into(), owner().into()];
    let (escrow, _) = contract.deploy(@calldata).unwrap();

    start_cheat_caller_address(escrow, owner());

    let booking_id: u256 = 1;
    let total: u256 = 750_000000000000000000;
    let bps: u16 = 500;

    IBookingEscrowDispatcher { contract_address: escrow }
        .create_booking(booking_id, 100, host(), guest(), connector(), total, bps);

    let booking = IBookingEscrowDispatcher { contract_address: escrow }
        .get_booking(booking_id);

    assert(booking.host_amount == 712_500000000000000000, 'Host amount');
    assert(booking.connector_amount == 37_500000000000000000, 'Connector amount');

    stop_cheat_caller_address(escrow);
}
