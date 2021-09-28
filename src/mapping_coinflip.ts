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
  CoinFlipDayData,
} from "../generated/schema";
import { log } from "@graphprotocol/graph-ts";

export function handleBetPlaced(event: BetPlaced): void {
  log.info("coinflip handleBetPlaced: {}", [event.params.betId.toString()]);
  let bet = CoinFlipBet.load(event.params.betId.toString());
  if (bet == null) {
    bet = new CoinFlipBet(event.params.betId.toString());
  }
  bet.betId = event.params.betId;
  bet.txHash = event.transaction.hash;
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
  log.info("coinflip handleBetSettled: {}", [event.params.betId.toString()]);
  let bet = CoinFlipBet.load(event.params.betId.toString());
  if (bet == null) {
    log.error("coinflip betsettled called without betplaced: {}", [
      event.params.betId.toString(),
    ]);
    // error
    return;
  }
  // settle the bet
  bet.isSettled = true;
  bet.outcome = event.params.outcome;
  bet.win = event.params.winAmount.gt(BigInt.fromI32(0));
  bet.winAmount = event.params.winAmount;
  bet.settledBlockNumber = event.block.number;
  bet.settledTimestamp = event.block.timestamp;

  // grab random number from chain since it's not provided in event
  let contract = CoinFlip.bind(event.address);
  let betFromChain = contract.bets(bet.betId);
  bet.randomNumber = betFromChain.value7;

  // save the bet
  bet.save();

  // update high scores if it's a win
  if (event.params.winAmount.gt(BigInt.fromI32(0))) {
    // update all time high scores
    let allTimeID = event.params.gambler
      .toHexString()
      .concat("-")
      .concat(event.params.token.toHexString());

    let allTime = CoinFlipAllTimeData.load(allTimeID);
    if (allTime == null) {
      allTime = new CoinFlipAllTimeData(allTimeID);
      allTime.userAddress = event.params.gambler;
      allTime.token = event.params.token;
      allTime.wins = BigInt.fromI32(0);
      allTime.amount = BigInt.fromI32(0);
    }

    allTime.wins = allTime.wins.plus(BigInt.fromI32(1));
    allTime.amount = allTime.amount.plus(event.params.winAmount);
    allTime.save();

    // update daily high scores
    let timestamp = event.block.timestamp.toI32();
    let dayID = timestamp / 86400;
    let dayStartTimestamp = dayID * 86400;
    let dayHighscoreID = dayID
      .toString()
      .concat("-")
      .concat(
        event.params.gambler
          .toHexString()
          .concat("-")
          .concat(event.params.token.toHexString())
      );

    let day = CoinFlipDayData.load(dayHighscoreID);
    if (day == null) {
      day = new CoinFlipDayData(dayHighscoreID);
      day.date = dayStartTimestamp;
      day.userAddress = event.params.gambler;
      day.token = event.params.token;
      day.wins = BigInt.fromI32(0);
      day.amount = BigInt.fromI32(0);
    }

    day.wins = day.wins.plus(BigInt.fromI32(1));
    day.amount = day.amount.plus(event.params.winAmount);
    day.save();
  }
}

export function handleBetRefunded(event: BetRefunded): void {
  log.info("coinflip handleBetRefunded: {}", [event.params.betId.toString()]);
  let bet = CoinFlipBet.load(event.params.betId.toString());
  if (bet == null) {
    // error
    log.error("coinflip betrefunded called without betplaced: {}", [
      event.params.betId.toString(),
    ]);
    return;
  }
  bet.isSettled = true;
  bet.winAmount = BigInt.fromI32(0);
  bet.win = false;
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
