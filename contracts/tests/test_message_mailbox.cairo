use snforge_std::{ContractClassTrait, DeclareResultTrait, declare};
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
