import { BigInt } from "@graphprotocol/graph-ts";
import {
  BarbellRoll,
  BetPlaced,
  BetRefunded,
  BetSettled,
} from "../generated/BarbellRoll/BarbellRoll";
import { BarbellRollBet } from "../generated/schema";
import { log } from "@graphprotocol/graph-ts";
import { updateLeaderboardData } from "./highscores";

export function handleBetPlaced(event: BetPlaced): void {
  log.info("barbellroll handleBetPlaced: {}", [event.params.betId.toString()]);
  let bet = BarbellRollBet.load(event.params.betId.toString());
  if (bet == null) {
    bet = new BarbellRollBet(event.params.betId.toString());
  }
  bet.betId = event.params.betId;
  bet.txHash = event.transaction.hash;
  bet.betAmount = event.params.amount;
  bet.low = event.params.low;
  bet.high = event.params.high;
  bet.placeBlockNumber = event.block.number;
  bet.placeTimestamp = event.block.timestamp;
  bet.player = event.params.gambler;
  bet.isSettled = false;
  bet.token = event.params.token;
  bet.save();
}

export function handleBetSettled(event: BetSettled): void {
  log.info("barbellroll handleBetSettled: {}", [event.params.betId.toString()]);
  let bet = BarbellRollBet.load(event.params.betId.toString());
  if (bet == null) {
    log.error("barbellroll betsettled called without betplaced: {}", [
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
  let contract = BarbellRoll.bind(event.address);
  let betFromChain = contract.bets(bet.betId);
  bet.randomNumber = betFromChain.value8;

  // save the bet
  bet.save();

  // update high scores
  updateLeaderboardData(
    event,
    "BarbellRoll",
    event.params.gambler,
    event.params.token,
    event.params.winAmount
  );
}

export function handleBetRefunded(event: BetRefunded): void {
  log.info("barbellroll handleBetRefunded: {}", [
    event.params.betId.toString(),
  ]);
  let bet = BarbellRollBet.load(event.params.betId.toString());
  if (bet == null) {
    // error
    log.error("barbellroll betrefunded called without betplaced: {}", [
      event.params.betId.toString(),
    ]);
    return;
  }
  bet.isSettled = true;
  bet.win = false;
  bet.winAmount = BigInt.fromI32(0);
  bet.randomNumber = BigInt.fromI32(0);
  bet.outcome = BigInt.fromI32(0);
  bet.save();
}
