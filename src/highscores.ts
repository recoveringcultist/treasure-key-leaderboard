import { BigInt } from "@graphprotocol/graph-ts";
import { Address, ethereum } from "@graphprotocol/graph-ts";
import { AllTimeData, DayData } from "../generated/schema";

export function updateLeaderboardData(
  event: ethereum.Event,
  game: string,
  player: Address,
  token: Address,
  winAmount: BigInt
): void {
  // update high scores if it's a win
  if (winAmount.gt(BigInt.fromI32(0))) {
    // update all time high scores
    let allTimeID = player
      .toHexString()
      .concat("-")
      .concat(token.toHexString());

    let allTime = AllTimeData.load(allTimeID);
    if (allTime == null) {
      allTime = new AllTimeData(allTimeID);
      allTime.game = game;
      allTime.userAddress = player;
      allTime.token = token;
      allTime.wins = BigInt.fromI32(0);
      allTime.amount = BigInt.fromI32(0);
    }

    allTime.wins = allTime.wins.plus(BigInt.fromI32(1));
    allTime.amount = allTime.amount.plus(winAmount);
    allTime.save();

    // update daily high scores
    let timestamp = event.block.timestamp.toI32();
    let dayID = timestamp / 86400;
    let dayStartTimestamp = dayID * 86400;
    let dayHighscoreID = dayID
      .toString()
      .concat("-")
      .concat(
        player
          .toHexString()
          .concat("-")
          .concat(token.toHexString())
      );

    let day = DayData.load(dayHighscoreID);
    if (day == null) {
      day = new DayData(dayHighscoreID);
      day.game = game;
      day.date = dayStartTimestamp;
      day.userAddress = player;
      day.token = token;
      day.wins = BigInt.fromI32(0);
      day.amount = BigInt.fromI32(0);
    }

    day.wins = day.wins.plus(BigInt.fromI32(1));
    day.amount = day.amount.plus(winAmount);
    day.save();
  }
}
