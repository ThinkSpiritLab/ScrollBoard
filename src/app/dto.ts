export interface Contest {
    problems: Problem[];
    teams: Team[];
    submissions: Submission[];
    duration: number;
    penaltyTime: number; // in minutes
    freezeTime: number;
    name: string;
    medal?: {
        gold: number;
        silver: number;
        bronze: number;
    }
    rule?: "icpc" | "ioi" // default = "icpc"
}

export interface Problem {
    id: string;
    tag: string;
    color?: string;
    score?: number; // required when contest.rule === "score"
}

export interface Team {
    id: string;
    name: string;
    userName?: string;
    certifiedName?: string;
    gender: string;
    wildcard: boolean;
}

export interface Submission {
    id: string;
    teamId: string;
    problemId: string;
    submitTime: number;
    accepted: boolean;
    score?: number; // required when contest.rule === "score"
}
