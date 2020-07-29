export interface Contest {
    problems: Problem[];
    contestants: User[];
    submissions: Submission[];
    duration: number;
    penaltyTime: number;
    freezeTime: number;
    name: string;
}

export interface Problem {
    id: string;
    tag: string;
    color?: string;
}

export interface User {
    id: string;
    name: string;
}

export interface Submission {
    id: string;
    userId: string;
    problemId: string;
    submitTime: number;
    accepted: boolean;
}
