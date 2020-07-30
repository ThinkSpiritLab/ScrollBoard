import * as dto from "./dto";

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
                rank: 1,
                solved: 0,
                penalty: 0,
                problemStates: data.problems.map(problem => ({
                    problem,
                    revealedSubmissions: [],
                    unrevealedSubmissions: [],
                    state: ProblemStateKind.Untouched,
                    tryCount: 0,
                }))
            });
    });

    data.submissions.forEach(submission => {
        const state = teamMap.get(submission.teamId);
        if (!state) {
            throw new Error("invalid data");
        }
        const p = state.problemStates.find(p => p.problem.id === submission.problemId);
        if (!p) {
            throw new Error("invalid data");
        }
        p.unrevealedSubmissions.push(submission);
        p.tryCount += 1;
        p.state = ProblemStateKind.Pending;
    });

    const contestantStates = Array.from(teamMap.entries()).map((e) => e[1]);

    return {
        teamStates: contestantStates,
        contest: data
    };

}