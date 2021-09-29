import { BigInt } from "@graphprotocol/graph-ts";
import {
  DiceRoll,
  BetPlaced,
  BetRefunded,
  BetSettled,
} from "../generated/DiceRoll/DiceRoll";
import { DiceRollBet } from "../generated/schema";
import { log } from "@graphprotocol/graph-ts";
import { updateLeaderboardData } from "./highscores";

export function handleBetPlaced(event: BetPlaced): void {
  log.info("diceroll handleBetPlaced: {}", [event.params.betId.toString()]);
  let bet = DiceRollBet.load(event.params.betId.toString());
  if (bet == null) {
    bet = new DiceRollBet(event.params.betId.toString());
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
  log.info("diceroll handleBetSettled: {}", [event.params.betId.toString()]);
  let bet = DiceRollBet.load(event.params.betId.toString());
  if (bet == null) {
    log.error("diceroll betsettled called without betplaced: {}", [
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
  let contract = DiceRoll.bind(event.address);
  let betFromChain = contract.bets(bet.betId);
  bet.randomNumber = betFromChain.value7;

  // save the bet
  bet.save();

  // update high scores
  updateLeaderboardData(
    event,
    "DiceRoll",
    event.params.gambler,
    event.params.token,
    event.params.winAmount
  );

  // update high scores if it's a win
  //   if (event.params.winAmount.gt(BigInt.fromI32(0))) {
  //     // update all time high scores
  //     let allTimeID = event.params.gambler
  //       .toHexString()
  //       .concat("-")
  //       .concat(event.params.token.toHexString());

  //     let allTime = DiceRollAllTimeData.load(allTimeID);
  //     if (allTime == null) {
  //       allTime = new DiceRollAllTimeData(allTimeID);
  //       allTime.userAddress = event.params.gambler;
  //       allTime.token = event.params.token;
  //       allTime.wins = BigInt.fromI32(0);
  //       allTime.amount = BigInt.fromI32(0);
  //     }

  //     allTime.wins = allTime.wins.plus(BigInt.fromI32(1));
  //     allTime.amount = allTime.amount.plus(event.params.winAmount);
  //     allTime.save();

  //     // update daily high scores
  //     let timestamp = event.block.timestamp.toI32();
  //     let dayID = timestamp / 86400;
  //     let dayStartTimestamp = dayID * 86400;
  //     let dayHighscoreID = dayID
  //       .toString()
  //       .concat("-")
  //       .concat(
  //         event.params.gambler
  //           .toHexString()
  //           .concat("-")
  //           .concat(event.params.token.toHexString())
  //       );

  //     let day = DiceRollDayData.load(dayHighscoreID);
  //     if (day == null) {
  //       day = new DiceRollDayData(dayHighscoreID);
  //       day.date = dayStartTimestamp;
  //       day.userAddress = event.params.gambler;
  //       day.token = event.params.token;
  //       day.wins = BigInt.fromI32(0);
  //       day.amount = BigInt.fromI32(0);
  //     }

  //     day.wins = day.wins.plus(BigInt.fromI32(1));
  //     day.amount = day.amount.plus(event.params.winAmount);
  //     day.save();
  //   }
}

export function handleBetRefunded(event: BetRefunded): void {
  log.info("diceroll handleBetRefunded: {}", [event.params.betId.toString()]);
  let bet = DiceRollBet.load(event.params.betId.toString());
  if (bet == null) {
    // error
    log.error("diceroll betrefunded called without betplaced: {}", [
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
