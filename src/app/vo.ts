import * as dto from "./dto";
import d3 from "d3-array";

export interface TeamState {
    team: dto.Team;
    rank: number;
    solved: number;
    penalty: number;
    problemStates: ProblemState[]
}

export interface ProblemState {
    problem: dto.Problem;
    revealedSubmissions: dto.Submission[];
    unrevealedSubmissions: dto.Submission[];
    state: ProblemStateKind;
    tryCount: number;
    acceptTime: number | null;
}

export enum ProblemStateKind {
    Passed,
    Failed,
    Pending,
    Untouched,
}

export interface ContestState {
    teamStates: TeamState[]
    contest: dto.Contest;
}

export function calcContestState(data: dto.Contest): ContestState {
    const teamMap: Map<string, TeamState> = new Map<string, TeamState>();
    data.teams.forEach(contestant => {
        teamMap.set(
            contestant.id,
            {
                team: contestant,
                rank: 0,
                solved: 0,
                penalty: 0,
                problemStates: data.problems.map(problem => ({
                    problem,
                    revealedSubmissions: [],
                    unrevealedSubmissions: [],
                    state: ProblemStateKind.Untouched,
                    tryCount: 0,
                    acceptTime: null,
                }))
            });
    });

    data.submissions.sort((lhs, rhs) => lhs.submitTime - rhs.submitTime);

    data.submissions.forEach(submission => {
        const team = teamMap.get(submission.teamId);
        if (!team) {
            throw new Error("invalid data");
        }
        const p = team.problemStates.find(p => p.problem.id === submission.problemId);
        if (!p) {
            throw new Error("invalid data");
        }
        if (submission.submitTime < data.freezeTime) {
            if (p.state !== ProblemStateKind.Passed) {
                p.revealedSubmissions.push(submission);
                p.tryCount += 1;
                if (submission.accepted) {
                    p.state = ProblemStateKind.Passed;
                    p.acceptTime = submission.submitTime;
                    team.solved += 1;
                    team.penalty += p.acceptTime + data.penaltyTime * (p.tryCount - 1);
                } else {
                    p.state = ProblemStateKind.Failed;
                }
            }
        } else {
            p.unrevealedSubmissions.push(submission);
            p.tryCount += 1;
            p.state = ProblemStateKind.Pending;
        }
    });

    const teamStates = Array.from(teamMap.entries()).map((e) => e[1]);
    const state = { teamStates, contest: data };
    calcRankInplace(state);
    return state;
}

export function calcRankInplace(state: ContestState): void {
    state.teamStates.sort((lhs, rhs) => {
        if (lhs.solved !== rhs.solved) {
            return -(lhs.solved - rhs.solved);
        }
        if (lhs.penalty !== rhs.penalty) {
            return (lhs.penalty - rhs.penalty);
        }
        if (lhs.team.name !== rhs.team.name) {
            return lhs.team.name < rhs.team.name ? (-1) : (1);
        }
        return 0;
    });

    let last_solved = 0;
    let last_penalty = 0;
    let last_rank = 0;
    state.teamStates.forEach((team) => {
        if (team.solved < last_solved || team.penalty > last_penalty) {
            last_rank += 1;
        }
        team.rank = last_rank;
        last_solved = team.solved;
        last_penalty = team.penalty;
    });
}
