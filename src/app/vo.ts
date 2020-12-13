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
    firstSolvers: { [problemId: string]: string | undefined; } // problemId -> teamId
    cursor: {
        index: number,
        tick: number,
        focus: number
    };
}

export function calcContestState(data: dto.Contest): ContestState {
    const teamMap: Map<string, TeamState> = new Map<string, TeamState>();
    const firstSolvers: { [problemId: string]: string | undefined; } = {};

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
    data.problems.sort((lhs, rhs) => {
        if (lhs.tag !== rhs.tag) {
            return lhs.tag < rhs.tag ? (-1) : 1;
        }
        return 0;
    });

    data.submissions.forEach(submission => {
        const team = teamMap.get(submission.teamId);
        if (!team) {
            return;
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
                team.penalty += p.acceptTime + data.penaltyTime * 60000 * (p.tryCount - 1);
                if (firstSolvers[p.info.id] === undefined) {
                    firstSolvers[p.info.id] = team.info.id;
                }
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
    const state = {
        teamStates,
        info: data,
        firstSolvers,
        cursor: {
            index: teamStates.length - 1,
            tick: 0,
            focus: teamStates.length - 1
        }
    };
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
        // if (lhs.info.name !== rhs.info.name) {
        //     return lhs.info.name < rhs.info.name ? (-1) : (1);
        // }
        const lhsId = parseInt(lhs.info.id);
        const rhsId = parseInt(rhs.info.id);
        if (lhsId !== rhsId) {
            return lhsId < rhsId ? (-1) : (1);
        }
        return 0;
    });

    let last_solved = 0;
    let last_penalty = 0;
    let last_rank = 1;
    state.teamStates.forEach((team, idx) => {
        if (team.info.wildcard) {
            team.rank = last_rank;
            return;
        }
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
        state.cursor.focus = state.cursor.index;
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
                team.penalty += p.acceptTime + state.info.penaltyTime * 60000 * (p.tryCount - 1);
                if (state.firstSolvers[p.info.id] === undefined) {
                    state.firstSolvers[p.info.id] = team.info.id;
                }
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
            state.cursor.focus = state.teamStates.findIndex(t => Object.is(t, team));
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
    state.cursor.focus = -1;
}

export interface BoardOptions {
    autoReveal: boolean;
    shiningBeforeReveal: boolean;
    speedFactor: number;
    showMedal: boolean;
    darkMode: boolean;
}

export const MIN_SPEED_FACTOR = 0.1;
export const MAX_SPEED_FACTOR = 10;

export const FLIP_MOVE_DURATION = 800;
