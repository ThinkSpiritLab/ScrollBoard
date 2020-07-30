import * as dto from "./dto";
import * as vo from "./vo";

import React, { useState } from "react";
import { Card } from "antd";


function cvtColor(state: vo.ProblemStateKind): string | undefined {
    if (state === vo.ProblemStateKind.Passed) {
        return "green";
    }
    if (state === vo.ProblemStateKind.Failed) {
        return "red";
    }
    if (state === vo.ProblemStateKind.Pending) {
        return "yellow";
    }
    return undefined;
}

interface BoardRowProps {
    state: vo.TeamState;
}

const BoardRow: React.FC<BoardRowProps> = ({ state }: BoardRowProps) => {
    return (
        <tr>
            <td>
                {state.rank}
            </td>
            <td>
                {state.team.name}
            </td>
            <td>
                {state.solved}
            </td>
            <td>
                {state.penalty}
            </td>
            {state.problemStates.map((p) => (
                <td key={p.problem.id}>
                    <span style={{
                        display: "inline-block",
                        minWidth: "4em",
                        minHeight: "1em",
                        borderRadius: "3px",
                        backgroundColor: cvtColor(p.state)
                    }} />
                </td>
            ))}
        </tr>
    );
};


interface BoardProps {
    data: dto.Contest;
}

const Board: React.FC<BoardProps> = ({ data }: BoardProps) => {
    const [state, setState] = useState<vo.ContestState>(vo.calcContestState(data));

    return (
        <Card
            style={{
                borderColor: "transparent",
                boxShadow: "0 1px 2px -2px rgba(0, 0, 0, 0.16), 0 3px 6px 0 rgba(0, 0, 0, 0.12), 0 5px 12px 4px rgba(0, 0, 0, 0.09)",
            }}
        >
            <table style={{ width: "100%" }}>
                <tr>
                    <th>
                        Rank
                    </th>
                    <th>
                        Team
                    </th>
                    <th>
                        Solved
                    </th>
                    <th>
                        Penalty
                    </th>
                    {data.problems.map(p => (
                        <th key={p.id}>
                            <strong style={{ marginRight: "0.5em" }}>{p.tag}</strong>
                            <span
                                style={{
                                    display: "inline-block",
                                    width: "1em",
                                    height: "1em",
                                    backgroundColor: p.color,
                                    borderRadius: "50%"
                                }}
                            />
                        </th>
                    ))}
                </tr>
                {state.teamStates.map((c) => (
                    <BoardRow key={c.team.id} state={c} />
                ))}
            </table>
        </Card>
    );
};

export default Board;