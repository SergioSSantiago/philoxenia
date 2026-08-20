use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address,
    stop_cheat_caller_address,
};
use starknet::ContractAddress;

use philoxenia_contracts::message_mailbox::{
    IMessageMailboxDispatcher, IMessageMailboxDispatcherTrait,
};

fn deploy_mailbox(pool: ContractAddress) -> IMessageMailboxDispatcher {
    let class = declare("MessageMailbox").unwrap().contract_class();
    let (addr, _) = class.deploy(@array![pool.into()]).unwrap();
    IMessageMailboxDispatcher { contract_address: addr }
}

#[test]
fn test_privacy_invoke_stores_and_counts() {
    let zero: ContractAddress = 0.try_into().unwrap();
    let mailbox = deploy_mailbox(zero);

    let channel: felt252 = 'channel_ab';
    let hash: felt252 = 'payload_hash';
    let span = mailbox.privacy_invoke(channel, hash, 3_u32, 0);
    assert(span.len() == 0, 'expected empty open notes');
    assert(mailbox.message_count() == 1, 'count');
    assert(mailbox.message_channel(1) == channel, 'channel');
    assert(mailbox.message_payload_hash(1) == hash, 'hash');
}

#[test]
#[should_panic(expected: 'ZERO_CHANNEL')]
fn test_privacy_invoke_rejects_zero_channel() {
    let zero: ContractAddress = 0.try_into().unwrap();
    let mailbox = deploy_mailbox(zero);
    mailbox.privacy_invoke(0, 'hash', 1_u32, 0);
}

#[test]
#[should_panic(expected: 'ZERO_HASH')]
fn test_privacy_invoke_rejects_zero_hash() {
    let zero: ContractAddress = 0.try_into().unwrap();
    let mailbox = deploy_mailbox(zero);
    mailbox.privacy_invoke('channel', 0, 1_u32, 0);
}

#[test]
#[should_panic(expected: 'ZERO_CHUNKS')]
fn test_privacy_invoke_rejects_zero_chunks() {
    let zero: ContractAddress = 0.try_into().unwrap();
    let mailbox = deploy_mailbox(zero);
    mailbox.privacy_invoke('channel', 'hash', 0_u32, 0);
}

#[test]
fn test_privacy_invoke_increments_across_posts() {
    let zero: ContractAddress = 0.try_into().unwrap();
    let mailbox = deploy_mailbox(zero);
    mailbox.privacy_invoke('ch_a', 'h1', 1_u32, 0);
    mailbox.privacy_invoke('ch_b', 'h2', 2_u32, 0);
    assert(mailbox.message_count() == 2, 'two posts');
    assert(mailbox.message_channel(2) == 'ch_b', 'second channel');
    assert(mailbox.message_payload_hash(2) == 'h2', 'second hash');
}

#[test]
#[should_panic(expected: 'NOT_PRIVACY_POOL')]
fn test_privacy_invoke_rejects_non_pool_when_allowlisted() {
    let pool: ContractAddress = 'pool'.try_into().unwrap();
    let stranger: ContractAddress = 'stranger'.try_into().unwrap();
    let mailbox = deploy_mailbox(pool);
    start_cheat_caller_address(mailbox.contract_address, stranger);
    mailbox.privacy_invoke('channel', 'hash', 1_u32, 0);
    stop_cheat_caller_address(mailbox.contract_address);
}
