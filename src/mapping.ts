import { BigInt } from "@graphprotocol/graph-ts";
import {
  CoinFlip,
  BetPlaced,
  BetRefunded,
  BetSettled,
  FlipCoin,
  OwnershipTransferred,
} from "../generated/CoinFlip/CoinFlip";
import {
  CoinFlipAllTimeData,
  CoinFlipBet,
  CoinFlipDay,
} from "../generated/schema";
import { log } from "@graphprotocol/graph-ts";

export function handleBetPlaced(event: BetPlaced): void {
  log.info("handleBetPlaced: {}", [event.params.betId.toString()]);
  let bet = CoinFlipBet.load(event.params.betId.toString());
  if (bet == null) {
    bet = new CoinFlipBet(event.params.betId.toString());
  }
  bet.betId = event.params.betId;
  bet.betAmount = event.params.amount;
  bet.playerChoice = event.params.choice;
  bet.placeBlockNumber = event.block.number;
  bet.placeTimestamp = event.block.timestamp;
  bet.player = event.params.gambler;
  bet.isSettled = false;
  bet.token = event.params.token;
  bet.save();
}

export function handleBetSettled(event: BetSettled): void {
  log.info("handleBetSettled: {}", [event.params.betId.toString()]);
  let bet = CoinFlipBet.load(event.params.betId.toString());
  if (bet == null) {
    log.error("betsettled called without betplaced: {}", [
      event.params.betId.toString(),
    ]);
    // error
    return;
  }
  // settle the bet
  bet.isSettled = true;
  bet.outcome = event.params.outcome;
  bet.winAmount = event.params.winAmount;
  bet.settledBlockNumber = event.block.number;
  bet.settledTimestamp = event.block.timestamp;

  // grab random number from chain since it's not provided in event
  let contract = CoinFlip.bind(event.address);
  let betFromChain = contract.bets(bet.betId);
  bet.randomNumber = betFromChain.value7;

  bet.save();

  // update high scores
  // let timestamp = event.block.timestamp.toI32();
  // let dayID = Math.floor(timestamp / 86400);
  // let dayStartTimestamp = dayID * 86400;
  // let day = CoinFlipDay.load(dayID.toString());
  // if(day == null) {
  //   day = new CoinFlipDay(dayID.toString())
  //   day.date = dayStartTimestamp;
  // }

  let allTime = CoinFlipAllTimeData.load(
    event.params.gambler
      .toHexString()
      .concat("-")
      .concat(event.params.token.toHexString())
  );
  if (allTime == null) {
    allTime = new CoinFlipAllTimeData(
      event.params.gambler
        .toHexString()
        .concat("-")
        .concat(event.params.token.toHexString())
    );
    allTime.userAddress = event.params.gambler;
    allTime.token = event.params.token;
    allTime.wins = BigInt.fromI32(0);
    allTime.amount = BigInt.fromI32(0);
  }

  if (event.params.outcome == true) {
    allTime.wins = allTime.wins.plus(BigInt.fromI32(1));
    allTime.amount = allTime.amount.plus(event.params.winAmount);
    allTime.save();
  }
}

export function handleBetRefunded(event: BetRefunded): void {
  log.info("handleBetRefunded: {}", [event.params.betId.toString()]);
  let bet = CoinFlipBet.load(event.params.betId.toString());
  if (bet == null) {
    // error
    log.error("betrefunded called without betplaced: {}", [
      event.params.betId.toString(),
    ]);
    return;
  }
  bet.isSettled = true;
  bet.winAmount = BigInt.fromI32(0);
  bet.randomNumber = BigInt.fromI32(0);
  bet.outcome = false;
  bet.save();
}

// Note: If a handler doesn't require existing field values, it is faster
// _not_ to load the entity from the store. Instead, create it fresh with
// `new Entity(...)`, set the fields that should be updated and save the
// entity back to the store. Fields that were not set or unset remain
// unchanged, allowing for partial updates to be applied.

// It is also possible to access smart contracts from mappings. For
// example, the contract that has emitted the event can be connected to
// with:
//
// let contract = Contract.bind(event.address)
//
// The following functions can then be called on this contract to access
// state variables and other data:
//
// - contract.BANK(...)
// - contract.JACKPOT(...)
// - contract.PIRATE(...)
// - contract.betMap(...)
// - contract.bets(...)
// - contract.betsLength(...)
// - contract.owner(...)
// - contract.tokenMaxBet(...)
// - contract.tokenMinBet(...)
// - contract.wealthTaxThreshold(...)
