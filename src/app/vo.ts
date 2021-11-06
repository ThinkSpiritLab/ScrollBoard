import * as dto from "./dto";

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

export interface ContestState {
    info: dto.Contest,
    teamStates: TeamState[],
    firstSolvers: { [problemId: string]: string | undefined; } // problemId -> teamId
    cursor: {
        index: number,
        tick: number,
        focus: number
    };
}

export interface TeamState {
    info: dto.Team,
    problemStates: ProblemState[],
    rank: number,
    score: number,
    penalty: number,
}

export interface ProblemState {
    info: dto.Problem,
    state: ProblemStateKind,
    revealedSubmissions: [number, dto.Submission][],
    unrevealedSubmissions: [number, dto.Submission][],
    highestScore: number,
    passIndex: number | null,
    passTime: number | null,
    tryCount: number,
}

export enum ProblemStateKind {
    Untouched = 0,
    Pending = 1,
    Passed = 2,
    Failed = 3,
}

export function calcContestState(data: dto.Contest): ContestState {
    data.submissions.sort((lhs, rhs) => lhs.submitTime - rhs.submitTime);
    data.problems.sort((lhs, rhs) => {
        if (lhs.tag !== rhs.tag) {
            return lhs.tag < rhs.tag ? (-1) : 1;
        }
        return 0;
    });

    const teamMap: Map<string, TeamState> = new Map<string, TeamState>();

    for (const team of data.teams) {
        const teamState: TeamState = {
            info: team,
            problemStates: data.problems.map(problem => ({
                info: problem,
                revealedSubmissions: [],
                unrevealedSubmissions: [],
                state: ProblemStateKind.Untouched,
                highestScore: 0,
                passIndex: null,
                passTime: null,
                tryCount: 0,
            })),
            rank: 0,
            score: 0,
            penalty: 0,
        };
        teamMap.set(team.id, teamState);
    }

    const firstSolvers: { [problemId: string]: string | undefined } = {};
    const rule = data.rule ?? "icpc";

    for (const submission of data.submissions) {
        const team = teamMap.get(submission.teamId);
        if (!team) continue;

        const problem = team.problemStates.find(p => p.info.id === submission.problemId);
        if (!problem) {
            throw new Error("invalid data");
        }

        if (rule === "icpc" && problem.state === ProblemStateKind.Passed) {
            continue;
        }

        const index = problem.revealedSubmissions.length + problem.unrevealedSubmissions.length;
        if (submission.submitTime >= data.freezeTime) {
            problem.unrevealedSubmissions.push([index, submission]);
            problem.state = ProblemStateKind.Pending;
        } else {
            const score = calcSubmissionScore(rule, submission);
            if (score > problem.highestScore) {
                if (problem.passIndex !== null && problem.passTime !== null) {
                    team.score -= problem.highestScore;
                    team.penalty -= problem.passTime + data.penaltyTime * 60000 * problem.passIndex;
                }
                problem.highestScore = score;
                problem.passIndex = index;
                problem.passTime = submission.submitTime;
                team.score += problem.highestScore;
                team.penalty += problem.passTime + data.penaltyTime * 60000 * problem.passIndex;
            }
            problem.revealedSubmissions.push([index, submission]);
            problem.state = (problem.highestScore > 0 ? ProblemStateKind.Passed : ProblemStateKind.Failed);
            problem.tryCount += 1;

            if (firstSolvers[problem.info.id] === undefined && submission.accepted) {
                firstSolvers[problem.info.id] = team.info.id;
            }
        }
    }


    const teamStates = Array.from(teamMap.values());

    const state: ContestState = {
        info: data,
        teamStates,
        firstSolvers,
        cursor: {
            index: teamStates.length - 1,
            tick: 0,
            focus: teamStates.length - 1,
        }
    };

    calcRankInplace(state);
    return state;
}

function calcSubmissionScore(rule: "icpc" | "ioi", submission: dto.Submission): number {
    let score = 0;
    if (rule === "icpc" && submission.accepted) {
        score = 1;
    }
    if (rule === "ioi" && submission.score !== undefined) {
        score = submission.score;
    }
    return score;
}

function calcRankInplace(state: ContestState): void {
    state.teamStates.sort((lhs, rhs) => {
        if (lhs.score !== rhs.score) {
            return -(lhs.score - rhs.score);
        }
        if (lhs.penalty !== rhs.penalty) {
            return (lhs.penalty - rhs.penalty);
        }
        const lhsId = parseInt(lhs.info.id);
        const rhsId = parseInt(rhs.info.id);
        if (lhsId !== rhsId) {
            return lhsId < rhsId ? (-1) : (1);
        }
        return 0;
    });

    let last_score = 0;
    let last_penalty = 0;
    let last_rank = 1;

    state.teamStates.forEach((team, idx) => {
        if (team.info.wildcard) {
            team.rank = last_rank;
            return;
        }
        if (team.score < last_score || team.penalty > last_penalty) {
            last_rank = idx + 1;
        }
        team.rank = last_rank;
        last_score = team.score;
        last_penalty = team.penalty;
    });
}

export type HighlightItem = {
    teamId: string;
    problemId: string;
    passed: boolean;
}

export type RevealGen = Generator<HighlightItem | undefined, void, void>;

export function* reveal(state: ContestState): Generator<HighlightItem | undefined, void, void> {
    const rule = state.info.rule ?? "icpc";

    while (state.cursor.index >= 0) {
        state.cursor.focus = state.cursor.index;
        const team = state.teamStates[state.cursor.index];
        const problem = team.problemStates.find(p => p.state === ProblemStateKind.Pending);

        if (problem) {
            const s = findMaxScoreUnrevealedSubmission(rule, problem);
            if (!s) {
                throw new Error("logic error");
            }
            const [index, submission] = s;
            const score = calcSubmissionScore(rule, submission);

            state.cursor.tick += 1;
            yield {
                teamId: team.info.id,
                problemId: problem.info.id,
                passed: score > problem.highestScore,
            };

            if (score > problem.highestScore) {
                if (problem.passIndex !== null && problem.passTime !== null) {
                    team.score -= problem.highestScore;
                    team.penalty -= problem.passTime + state.info.penaltyTime * 60000 * problem.passIndex;
                }
                problem.highestScore = score;
                problem.passIndex = index;
                problem.passTime = submission.submitTime;
                team.score += problem.highestScore;
                team.penalty += problem.passTime + state.info.penaltyTime * 60000 * problem.passIndex;
            }
            problem.state = (problem.highestScore > 0 ? ProblemStateKind.Passed : ProblemStateKind.Failed);
            if (state.firstSolvers[problem.info.id] === undefined && submission.accepted) {
                state.firstSolvers[problem.info.id] = team.info.id;
            }
            if (problem.state === ProblemStateKind.Failed) {
                problem.tryCount += problem.unrevealedSubmissions.length;
            }
            problem.unrevealedSubmissions = [];
            problem.revealedSubmissions.push(...problem.unrevealedSubmissions);

            state.cursor.tick += 1;
            yield;

            const prevRank = team.rank;
            calcRankInplace(state);
            const curRank = team.rank;
            console.log(`team "${team.info.name}" rank ${prevRank} -> ${curRank}`);
            state.cursor.focus = state.teamStates.findIndex(t => Object.is(t, team));

            state.cursor.tick += 1;
            yield;

        } else {
            if (state.cursor.index !== state.teamStates.length - 1) {
                state.cursor.tick += 1;
                yield;
            }
            state.cursor.index -= 1;
        }
    }
    state.cursor.focus = -1;
}

function findMaxScoreUnrevealedSubmission(rule: "icpc" | "ioi", problem: ProblemState): [number, dto.Submission] | null {
    let ans: [number, dto.Submission] | null = null;
    let ans_score = 0;
    for (const s of problem.unrevealedSubmissions) {
        const score = calcSubmissionScore(rule, s[1]);
        if (ans === null) {
            ans = s;
            ans_score = score;
        } else if (score > ans_score) {
            ans = s;
        }
    }
    return ans;
}