import type { Result } from "@/@core/domain/result";
import type { DomainError } from "@/@core/domain/errors/domain-error.base";
import type {
  Raffle,
  RaffleCandidate,
  RaffleFilterType,
  RafflePrizeStatus,
  RaffleStatus,
} from "../entities/raffle.entity";

export type RafflePrizeReadModel = {
  id: string;
  raffleId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  status: RafflePrizeStatus;
  winnerRegistrationId: string | null;
  winnerParticipantId: string | null;
  winnerName: string | null;
  winnerTicketCode: string | null;
  drawnAt: Date | null;
  disqualificationReason: string | null;
};

export type RaffleDrawHistoryItem = {
  id: string;
  raffleId: string;
  prizeId: string;
  prizeTitle: string;
  winnerRegistrationId: string | null;
  winnerName: string;
  winnerTicketCode: string | null;
  action: "sorteado" | "anulado" | "reiniciado";
  reason: string | null;
  drawnByUserName: string | null;
  createdAt: Date;
};

export type RaffleSummary = {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  participantFilter: RaffleFilterType;
  allowRepeatWinners: boolean;
  animationDurationSeconds: number;
  status: RaffleStatus;
  publicToken: string;
  currentPrizeId: string | null;
  showWinnersSummary: boolean;
  prizesCount: number;
  drawnPrizesCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type RaffleDetail = {
  id: string;
  eventId: string;
  eventTitle: string;
  title: string;
  description: string | null;
  participantFilter: RaffleFilterType;
  allowRepeatWinners: boolean;
  animationDurationSeconds: number;
  status: RaffleStatus;
  publicToken: string;
  currentPrizeId: string | null;
  showWinnersSummary: boolean;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  prizes: RafflePrizeReadModel[];
  manualRegistrationIds: string[];
  eligibleCandidates: RaffleCandidate[];
  allConfirmedCandidates: RaffleCandidate[];
  history: RaffleDrawHistoryItem[];
};

export type PublicRaffleView = {
  id: string;
  eventId: string;
  eventTitle: string;
  title: string;
  description: string | null;
  status: RaffleStatus;
  animationDurationSeconds: number;
  currentPrizeId: string | null;
  showWinnersSummary: boolean;
  totalEligibleCount: number;
  candidatePool: {
    name: string;
    ticketCode: string;
  }[];
  prizes: {
    id: string;
    title: string;
    description: string | null;
    orderIndex: number;
    status: RafflePrizeStatus;
    winnerName: string | null;
    winnerTicketCode: string | null;
    drawnAt: Date | null;
  }[];
  updatedAt: Date;
};

export type RaffleActionType =
  | "start"
  | "select_prize"
  | "draw_prize"
  | "confirm_prize"
  | "redraw_prize"
  | "next_prize"
  | "toggle_summary"
  | "reset"
  | "cancel";

export type ExecuteRaffleActionParams = {
  eventId: string;
  raffleId: string;
  action: RaffleActionType;
  prizeId?: string;
  reason?: string | null;
  actorId: string;
  actorName: string;
  canManageAll: boolean;
};

export interface IRaffleRepository {
  listByEvent(params: {
    eventId: string;
    actorId: string;
    canManageAll: boolean;
  }): Promise<RaffleSummary[]>;

  findDetailById(params: {
    eventId: string;
    raffleId: string;
    actorId: string;
    canManageAll: boolean;
  }): Promise<RaffleDetail | null>;

  findPublicByToken(token: string): Promise<PublicRaffleView | null>;

  create(params: {
    raffle: Raffle;
    actorId: string;
    canManageAll: boolean;
  }): Promise<Result<RaffleDetail, DomainError>>;

  update(params: {
    eventId: string;
    raffleId: string;
    raffle: Raffle;
    actorId: string;
    canManageAll: boolean;
  }): Promise<Result<RaffleDetail, DomainError>>;

  delete(params: {
    eventId: string;
    raffleId: string;
    actorId: string;
    canManageAll: boolean;
  }): Promise<Result<void, DomainError>>;

  executeAction(
    params: ExecuteRaffleActionParams,
  ): Promise<Result<RaffleDetail, DomainError>>;
}

export abstract class RaffleRepository implements IRaffleRepository {
  abstract listByEvent(params: {
    eventId: string;
    actorId: string;
    canManageAll: boolean;
  }): Promise<RaffleSummary[]>;

  abstract findDetailById(params: {
    eventId: string;
    raffleId: string;
    actorId: string;
    canManageAll: boolean;
  }): Promise<RaffleDetail | null>;

  abstract findPublicByToken(token: string): Promise<PublicRaffleView | null>;

  abstract create(params: {
    raffle: Raffle;
    actorId: string;
    canManageAll: boolean;
  }): Promise<Result<RaffleDetail, DomainError>>;

  abstract update(params: {
    eventId: string;
    raffleId: string;
    raffle: Raffle;
    actorId: string;
    canManageAll: boolean;
  }): Promise<Result<RaffleDetail, DomainError>>;

  abstract delete(params: {
    eventId: string;
    raffleId: string;
    actorId: string;
    canManageAll: boolean;
  }): Promise<Result<void, DomainError>>;

  abstract executeAction(
    params: ExecuteRaffleActionParams,
  ): Promise<Result<RaffleDetail, DomainError>>;
}
