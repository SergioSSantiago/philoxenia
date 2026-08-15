use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use philoxenia_contracts::booking_escrow::{
    IBookingEscrowDispatcher, IBookingEscrowDispatcherTrait,
};
use philoxenia_contracts::booking_escrow_anonymizer::{
    IBookingEscrowAnonymizerDispatcher, IBookingEscrowAnonymizerDispatcherTrait,
};
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address,
    stop_cheat_caller_address,
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

fn pool() -> ContractAddress {
    'privacy_pool'.try_into().unwrap()
}

fn zero() -> ContractAddress {
    0.try_into().unwrap()
}

fn deploy_token(recipient: ContractAddress, supply: u256) -> ContractAddress {
    let contract = declare("MockERC20").unwrap().contract_class();
    let mut calldata = array![];
    let name: ByteArray = "Mock";
    let symbol: ByteArray = "MCK";
    name.serialize(ref calldata);
    symbol.serialize(ref calldata);
    supply.serialize(ref calldata);
    recipient.serialize(ref calldata);
    let (token, _) = contract.deploy(@calldata).unwrap();
    token
}

fn deploy_escrow(token: ContractAddress, anonymizer: ContractAddress) -> ContractAddress {
    let contract = declare("BookingEscrow").unwrap().contract_class();
    let mut calldata = array![
        token.into(), owner().into(), treasury().into(), anonymizer.into(),
    ];
    let (escrow, _) = contract.deploy(@calldata).unwrap();
    escrow
}

fn deploy_anonymizer() -> ContractAddress {
    let contract = declare("BookingEscrowAnonymizer").unwrap().contract_class();
    let (anon, _) = contract.deploy(@array![]).unwrap();
    anon
}

#[test]
fn test_anonymizer_can_set_and_read() {
    let token = deploy_token(owner(), 1);
    let escrow = deploy_escrow(token, zero());
    let anon = deploy_anonymizer();

    start_cheat_caller_address(escrow, owner());
    IBookingEscrowDispatcher { contract_address: escrow }.set_anonymizer(anon);
    stop_cheat_caller_address(escrow);

    assert(
        IBookingEscrowDispatcher { contract_address: escrow }.get_anonymizer() == anon,
        'anon set',
    );
}

#[test]
fn test_privacy_invoke_create_fund_settle() {
    let total: u256 = 1000_000000000000000000;
    let token = deploy_token(pool(), total);
    let anon = deploy_anonymizer();
    let escrow = deploy_escrow(token, anon);

    // Pool withdraws tokens to anonymizer (simulated).
    start_cheat_caller_address(token, pool());
    IERC20Dispatcher { contract_address: token }.transfer(anon, total);
    stop_cheat_caller_address(token);

    let booking_id: u256 = 42;
    start_cheat_caller_address(anon, pool());
    let deposits = IBookingEscrowAnonymizerDispatcher { contract_address: anon }
        .privacy_invoke(
            escrow,
            token,
            booking_id,
            7,
            host(),
            guest(),
            zero(),
            total,
            0,
            'note',
        );
    stop_cheat_caller_address(anon);

    assert(deposits.len() == 0, 'no leftover note');

    let booking = IBookingEscrowDispatcher { contract_address: escrow }.get_booking(booking_id);
    assert(booking.funded, 'funded');
    assert(booking.settled, 'settled');
    assert(booking.host_amount == total, 'host amount');

    let host_bal = IERC20Dispatcher { contract_address: token }.balance_of(host());
    assert(host_bal == total, 'host paid');
    let anon_bal = IERC20Dispatcher { contract_address: token }.balance_of(anon);
    assert(anon_bal == 0, 'anon empty');
}

#[test]
#[should_panic(expected: 'INSUFFICIENT_BALANCE')]
fn test_anonymizer_rejects_without_balance() {
    let token = deploy_token(owner(), 1);
    let anon = deploy_anonymizer();
    let escrow = deploy_escrow(token, anon);

    start_cheat_caller_address(anon, pool());
    IBookingEscrowAnonymizerDispatcher { contract_address: anon }
        .privacy_invoke(
            escrow,
            token,
            1,
            1,
            host(),
            guest(),
            zero(),
            100,
            0,
            'note',
        );
}
