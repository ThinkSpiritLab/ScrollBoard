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
}

export interface Problem {
    id: string;
    tag: string;
    color?: string;
}

export interface Team {
    id: string;
    name: string;
    userName?: string;
}

export interface Submission {
    id: string;
    teamId: string;
    problemId: string;
    submitTime: number;
    accepted: boolean;
}
