//! Formal-style properties for BookingEscrow + anonymizer (snforge).
//!
//! Each test maps to an invariant we would write in CVL if this were Solidity:
//! split conservation, token conservation, terminal state machine, auth, no dust.

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

const BPS_DENOM: u256 = 10000_u256;
const PROTOCOL_TAKE_BPS: u256 = 1000_u256;
const MAX_MINT: u256 = 0xffffffffffffffffffffffffffffffff_u256;

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

/// Mirror on-chain split math for property checks.
fn expected_split(total: u256, reward_bps: u16, with_connector: bool) -> (u256, u256, u256) {
    if with_connector {
        let gross = total * reward_bps.into() / BPS_DENOM;
        let protocol_amt = gross * PROTOCOL_TAKE_BPS / BPS_DENOM;
        let connector_net = gross - protocol_amt;
        let host_amt = total - gross;
        (host_amt, connector_net, protocol_amt)
    } else {
        (total, 0_u256, 0_u256)
    }
}

fn assert_split_conservation(
    host_amount: u256,
    connector_amount: u256,
    protocol_amount: u256,
    total_amount: u256,
) {
    assert(
        host_amount + connector_amount + protocol_amount == total_amount,
        'SPLIT_NOT_CONSERVED',
    );
}

fn create_booking(
    escrow: ContractAddress,
    caller: ContractAddress,
    booking_id: u256,
    total: u256,
    reward_bps: u16,
    with_connector: bool,
) {
    let conn = if with_connector {
        connector()
    } else {
        zero()
    };
    start_cheat_caller_address(escrow, caller);
    IBookingEscrowDispatcher { contract_address: escrow }
        .create_booking(booking_id, 1, host(), guest(), conn, total, reward_bps);
    stop_cheat_caller_address(escrow);
}

fn fund_as(
    escrow: ContractAddress,
    token: ContractAddress,
    payer: ContractAddress,
    booking_id: u256,
    amount: u256,
) {
    start_cheat_caller_address(token, payer);
    IERC20Dispatcher { contract_address: token }.approve(escrow, amount);
    stop_cheat_caller_address(token);
    start_cheat_caller_address(escrow, payer);
    IBookingEscrowDispatcher { contract_address: escrow }.fund_booking(booking_id);
    stop_cheat_caller_address(escrow);
}

fn settle_as(escrow: ContractAddress, caller: ContractAddress, booking_id: u256) {
    start_cheat_caller_address(escrow, caller);
    IBookingEscrowDispatcher { contract_address: escrow }.settle_booking(booking_id);
    stop_cheat_caller_address(escrow);
}

fn refund_as(escrow: ContractAddress, caller: ContractAddress, booking_id: u256) {
    start_cheat_caller_address(escrow, caller);
    IBookingEscrowDispatcher { contract_address: escrow }.refund_booking(booking_id);
    stop_cheat_caller_address(escrow);
}

fn sum_recipient_balances(
    token: ContractAddress, host_addr: ContractAddress, conn: ContractAddress, treas: ContractAddress,
) -> u256 {
    let erc20 = IERC20Dispatcher { contract_address: token };
    erc20.balance_of(host_addr)
        + erc20.balance_of(conn)
        + erc20.balance_of(treas)
}

// --- Split invariants (create_booking) ---

#[test]
#[fuzzer(runs: 128, seed: 42)]
fn fuzz_create_split_conserved_direct(total_raw: u128) {
    if total_raw == 0 {
        return;
    }
    let total: u256 = total_raw.into();
    let escrow = deploy_escrow(deploy_token(owner(), 1), zero());
    create_booking(escrow, guest(), 9001, total, 0, false);
    let booking = IBookingEscrowDispatcher { contract_address: escrow }.get_booking(9001);
    assert_split_conservation(
        booking.host_amount,
        booking.connector_amount,
        booking.protocol_amount,
        booking.total_amount,
    );
    let (exp_host, exp_conn, exp_proto) = expected_split(total, 0, false);
    assert(booking.host_amount == exp_host, 'HOST_SPLIT');
    assert(booking.connector_amount == exp_conn, 'CONN_SPLIT');
    assert(booking.protocol_amount == exp_proto, 'PROTO_SPLIT');
    assert(!booking.funded, 'NOT_FUNDED_YET');
}

#[test]
#[fuzzer(runs: 128, seed: 43)]
fn fuzz_create_split_conserved_with_connector(total_raw: u128, reward_bps: u16) {
    if total_raw == 0 || reward_bps == 0 || reward_bps > 10000 {
        return;
    }
    let total: u256 = total_raw.into();
    let escrow = deploy_escrow(deploy_token(owner(), 1), zero());
    create_booking(escrow, guest(), 9002, total, reward_bps, true);
    let booking = IBookingEscrowDispatcher { contract_address: escrow }.get_booking(9002);
    assert_split_conservation(
        booking.host_amount,
        booking.connector_amount,
        booking.protocol_amount,
        booking.total_amount,
    );
    let (exp_host, exp_conn, exp_proto) = expected_split(total, reward_bps, true);
    assert(booking.host_amount == exp_host, 'HOST_SPLIT');
    assert(booking.connector_amount == exp_conn, 'CONN_SPLIT');
    assert(booking.protocol_amount == exp_proto, 'PROTO_SPLIT');
    // Protocol take is exactly 10% of connector gross, never of total.
    let gross = total * reward_bps.into() / BPS_DENOM;
    assert(booking.protocol_amount == gross * PROTOCOL_TAKE_BPS / BPS_DENOM, 'PROTO_10PCT');
}

// --- Token conservation (fund → settle / refund) ---

#[test]
#[fuzzer(runs: 64, seed: 44)]
fn fuzz_settle_conserves_tokens(total_raw: u128, reward_bps: u16) {
    if total_raw == 0 || reward_bps > 10000 {
        return;
    }
    let with_connector = reward_bps > 0;
    let total: u256 = total_raw.into();
    let token = deploy_token(guest(), MAX_MINT);
    let escrow = deploy_escrow(token, zero());

    let host_before = IERC20Dispatcher { contract_address: token }.balance_of(host());
    let conn_before = IERC20Dispatcher { contract_address: token }.balance_of(connector());
    let treas_before = IERC20Dispatcher { contract_address: token }.balance_of(treasury());

    create_booking(escrow, guest(), 8001, total, reward_bps, with_connector);
    fund_as(escrow, token, guest(), 8001, total);
    settle_as(escrow, guest(), 8001);

    let booking = IBookingEscrowDispatcher { contract_address: escrow }.get_booking(8001);
    assert(booking.settled, 'MUST_SETTLE');
    assert(!booking.refunded, 'NOT_REFUNDED');

    let erc20 = IERC20Dispatcher { contract_address: token };
    assert(erc20.balance_of(escrow) == 0, 'ESCROW_EMPTY');
    assert(
        erc20.balance_of(host()) - host_before == booking.host_amount, 'HOST_PAID',
    );
    assert(
        erc20.balance_of(connector()) - conn_before == booking.connector_amount, 'CONN_PAID',
    );
    assert(
        erc20.balance_of(treasury()) - treas_before == booking.protocol_amount, 'TREAS_PAID',
    );
}

#[test]
#[fuzzer(runs: 64, seed: 45)]
fn fuzz_refund_returns_full_deposit(total_raw: u128) {
    if total_raw == 0 {
        return;
    }
    let total: u256 = total_raw.into();
    let token = deploy_token(guest(), MAX_MINT);
    let escrow = deploy_escrow(token, zero());

    let guest_before = IERC20Dispatcher { contract_address: token }.balance_of(guest());

    create_booking(escrow, guest(), 8002, total, 0, false);
    fund_as(escrow, token, guest(), 8002, total);
    refund_as(escrow, host(), 8002);

    let booking = IBookingEscrowDispatcher { contract_address: escrow }.get_booking(8002);
    assert(booking.refunded, 'MUST_REFUND');
    assert(!booking.settled, 'NOT_SETTLED');

    let erc20 = IERC20Dispatcher { contract_address: token };
    assert(erc20.balance_of(escrow) == 0, 'ESCROW_EMPTY');
    assert(erc20.balance_of(guest()) == guest_before, 'GUEST_REFUNDED');
}

// --- Anonymizer: no dust, full distribution ---

#[test]
#[fuzzer(runs: 64, seed: 46)]
fn fuzz_anonymizer_settle_no_leftover(total_raw: u128, reward_bps: u16) {
    if total_raw == 0 || reward_bps > 10000 {
        return;
    }
    let with_connector = reward_bps > 0;
    let total: u256 = total_raw.into();
    let token = deploy_token(pool(), total);
    let anon = deploy_anonymizer();
    let escrow = deploy_escrow(token, anon);

    start_cheat_caller_address(token, pool());
    IERC20Dispatcher { contract_address: token }.transfer(anon, total);
    stop_cheat_caller_address(token);

    let recipients_before = sum_recipient_balances(token, host(), connector(), treasury());

    start_cheat_caller_address(anon, pool());
    let deposits = IBookingEscrowAnonymizerDispatcher { contract_address: anon }
        .privacy_invoke(
            escrow,
            token,
            7001,
            1,
            host(),
            guest(),
            if with_connector {
                connector()
            } else {
                zero()
            },
            total,
            reward_bps,
            'note',
        );
    stop_cheat_caller_address(anon);

    assert(deposits.len() == 0, 'NO_LEFTOVER_NOTE');
    let erc20 = IERC20Dispatcher { contract_address: token };
    assert(erc20.balance_of(anon) == 0, 'ANON_EMPTY');
    assert(erc20.balance_of(escrow) == 0, 'ESCROW_EMPTY');

    let recipients_after = sum_recipient_balances(token, host(), connector(), treasury());
    assert(recipients_after - recipients_before == total, 'ALL_TOKENS_OUT');

    let booking = IBookingEscrowDispatcher { contract_address: escrow }.get_booking(7001);
    assert(booking.funded && booking.settled, 'DONE');
    assert_split_conservation(
        booking.host_amount,
        booking.connector_amount,
        booking.protocol_amount,
        booking.total_amount,
    );
}

// --- State machine: illegal transitions must revert ---

#[test]
#[should_panic(expected: 'Already funded')]
fn invariant_cannot_fund_twice() {
    let total: u256 = 100;
    let token = deploy_token(guest(), total);
    let escrow = deploy_escrow(token, zero());
    create_booking(escrow, guest(), 1, total, 0, false);
    fund_as(escrow, token, guest(), 1, total);
    fund_as(escrow, token, guest(), 1, total);
}

#[test]
#[should_panic(expected: 'Not funded')]
fn invariant_cannot_settle_unfunded() {
    let escrow = deploy_escrow(deploy_token(owner(), 1), zero());
    create_booking(escrow, guest(), 2, 100, 0, false);
    settle_as(escrow, guest(), 2);
}

#[test]
#[should_panic(expected: 'Already settled')]
fn invariant_cannot_settle_twice() {
    let total: u256 = 100;
    let token = deploy_token(guest(), total);
    let escrow = deploy_escrow(token, zero());
    create_booking(escrow, guest(), 3, total, 0, false);
    fund_as(escrow, token, guest(), 3, total);
    settle_as(escrow, guest(), 3);
    settle_as(escrow, guest(), 3);
}

#[test]
#[should_panic(expected: 'Already settled')]
fn invariant_cannot_refund_after_settle() {
    let total: u256 = 100;
    let token = deploy_token(guest(), total);
    let escrow = deploy_escrow(token, zero());
    create_booking(escrow, guest(), 4, total, 0, false);
    fund_as(escrow, token, guest(), 4, total);
    settle_as(escrow, guest(), 4);
    refund_as(escrow, host(), 4);
}

#[test]
#[should_panic(expected: 'Booking exists')]
fn invariant_cannot_recreate_booking_id() {
    let escrow = deploy_escrow(deploy_token(owner(), 1), zero());
    create_booking(escrow, guest(), 5, 100, 0, false);
    create_booking(escrow, guest(), 5, 200, 0, false);
}

#[test]
#[should_panic(expected: 'Only guest/anon')]
fn invariant_only_guest_or_anon_funds() {
    let total: u256 = 100;
    let token = deploy_token(guest(), total);
    let escrow = deploy_escrow(token, zero());
    create_booking(escrow, guest(), 6, total, 0, false);
    fund_as(escrow, token, host(), 6, total);
}

#[test]
#[should_panic(expected: 'Unauthorized')]
fn invariant_host_cannot_settle() {
    let total: u256 = 100;
    let token = deploy_token(guest(), total);
    let escrow = deploy_escrow(token, zero());
    create_booking(escrow, guest(), 7, total, 0, false);
    fund_as(escrow, token, guest(), 7, total);
    settle_as(escrow, host(), 7);
}
