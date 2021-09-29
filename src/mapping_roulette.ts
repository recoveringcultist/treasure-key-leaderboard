import { BigInt } from "@graphprotocol/graph-ts";
import {
  Roulette,
  BetPlaced,
  BetRefunded,
  BetSettled,
} from "../generated/Roulette/Roulette";
import { RouletteBet } from "../generated/schema";
import { log } from "@graphprotocol/graph-ts";
import { updateLeaderboardData } from "./highscores";

export function handleBetPlaced(event: BetPlaced): void {
  log.info("roulette handleBetPlaced: {}", [event.params.betId.toString()]);
  let bet = RouletteBet.load(event.params.betId.toString());
  if (bet == null) {
    bet = new RouletteBet(event.params.betId.toString());
  }
  bet.betId = event.params.betId;
  bet.txHash = event.transaction.hash;
  bet.betAmount = event.params.amount;
  bet.betType = event.params.betType;
  bet.playerChoice = event.params.choice;
  bet.placeBlockNumber = event.block.number;
  bet.placeTimestamp = event.block.timestamp;
  bet.player = event.params.gambler;
  bet.isSettled = false;
  bet.token = event.params.token;
  bet.save();
}

export function handleBetSettled(event: BetSettled): void {
  log.info("roulette handleBetSettled: {}", [event.params.betId.toString()]);
  let bet = RouletteBet.load(event.params.betId.toString());
  if (bet == null) {
    log.error("roulette betsettled called without betplaced: {}", [
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
  let contract = Roulette.bind(event.address);
  let betFromChain = contract.bets(bet.betId);
  bet.randomNumber = betFromChain.value8;

  // save the bet
  bet.save();

  // update high scores
  updateLeaderboardData(
    event,
    "Roulette",
    event.params.gambler,
    event.params.token,
    event.params.winAmount
  );
}

export function handleBetRefunded(event: BetRefunded): void {
  log.info("roulette handleBetRefunded: {}", [event.params.betId.toString()]);
  let bet = RouletteBet.load(event.params.betId.toString());
  if (bet == null) {
    // error
    log.error("roulette betrefunded called without betplaced: {}", [
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
