import * as dto from "./dto";

export interface TeamState {
    info: dto.Team;
    rank: number;
    solved: number;
    penalty: number;
    problemStates: ProblemState[]
}

export interface ProblemState {
    info: dto.Problem;
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
    info: dto.Contest;
    cursor: { index: number, tick: number };
}

export function calcContestState(data: dto.Contest): ContestState {
    const teamMap: Map<string, TeamState> = new Map<string, TeamState>();
    data.teams.forEach(contestant => {
        teamMap.set(
            contestant.id,
            {
                info: contestant,
                rank: 0,
                solved: 0,
                penalty: 0,
                problemStates: data.problems.map(problem => ({
                    info: problem,
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
        const p = team.problemStates.find(p => p.info.id === submission.problemId);
        if (!p) {
            throw new Error("invalid data");
        }
        if (p.state === ProblemStateKind.Passed) {
            return;
        }
        if (submission.submitTime < data.freezeTime) {
            p.revealedSubmissions.push(submission);
            p.tryCount += 1;
            if (submission.accepted) {
                p.state = ProblemStateKind.Passed;
                p.acceptTime = submission.submitTime;
                team.solved += 1;
                team.penalty += Math.floor(p.acceptTime / 60000) * 60000 + data.penaltyTime * (p.tryCount - 1);
            } else {
                p.state = ProblemStateKind.Failed;
            }
        } else {
            p.unrevealedSubmissions.push(submission);
            p.tryCount += 1;
            p.state = ProblemStateKind.Pending;
        }
    });

    const teamStates = Array.from(teamMap.entries()).map((e) => e[1]);
    const state = { teamStates, info: data, cursor: { index: teamStates.length - 1, tick: 0 } };
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
        if (lhs.info.name !== rhs.info.name) {
            return lhs.info.name < rhs.info.name ? (-1) : (1);
        }
        return 0;
    });

    let last_solved = 0;
    let last_penalty = 0;
    let last_rank = 0;
    state.teamStates.forEach((team, idx) => {
        if (team.solved < last_solved || team.penalty > last_penalty) {
            last_rank = idx + 1;
        }
        team.rank = last_rank;
        last_solved = team.solved;
        last_penalty = team.penalty;
    });
}

export type HighlightItem = {
    teamId: string;
    problemId: string;
    accepted: boolean;
}

export type RevealGen = Generator<HighlightItem | undefined, void, void>;

export function* reveal(state: ContestState): Generator<HighlightItem | undefined, void, void> {
    let checked = true;
    while (state.cursor.index >= 0) {
        const team = state.teamStates[state.cursor.index];
        const p = team.problemStates.find(p => p.state === ProblemStateKind.Pending);
        if (p) {
            if (!checked) {
                state.cursor.tick += 1;
                yield;
            }

            const isAccepted = p.unrevealedSubmissions.some((s) => s.accepted);
            state.cursor.tick += 1;
            yield {
                teamId: team.info.id,
                problemId: p.info.id,
                accepted: isAccepted
            };
            if (isAccepted) {
                p.state = ProblemStateKind.Passed;
                const idx = p.unrevealedSubmissions.findIndex(s => s.accepted);
                p.tryCount = p.tryCount - p.unrevealedSubmissions.length + idx + 1;
                p.acceptTime = p.unrevealedSubmissions[idx].submitTime;
                team.solved += 1;
                team.penalty += Math.floor(p.acceptTime / 60000) * 60000 + state.info.penaltyTime * (p.tryCount - 1);
            } else {
                p.state = ProblemStateKind.Failed;
            }
            p.revealedSubmissions.push(...p.unrevealedSubmissions);
            p.unrevealedSubmissions = [];
            yield;
            const prevRank = team.rank;
            calcRankInplace(state);
            const curRank = team.rank;
            console.log(`team "${team.info.name}" rank ${prevRank} -> ${curRank}`);
            state.cursor.tick += 1;
            yield;
            checked = true;
        }
        else {
            if (!checked) {
                console.log("yield at cursor index = ", state.cursor.index);
                state.cursor.tick += 1;
                yield;
            }
            state.cursor.index -= 1;
            checked = false;
        }
    }
}

export interface BoardOptions {
    autoReveal: boolean;
    shiningBeforeReveal: boolean;
}