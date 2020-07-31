import * as dto from "./dto";
import * as vo from "./vo";

import React, { useState, useEffect, useCallback, useRef, CSSProperties, useMemo } from "react";
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

interface BoardProps {
    data: dto.Contest;
}

const Board: React.FC<BoardProps> = ({ data }: BoardProps) => {

    const [state, setState] = useState<vo.ContestState>(useMemo(() => vo.calcContestState(data), [data]));

    const [highlightItem, setHighlightItem] = useState<vo.HighlightItem | null>(null);

    const revealGen = useRef<vo.RevealGen>(vo.reveal(state));

    const handleNextStep = useCallback((event: KeyboardEvent) => {
        if (event.key === "Enter") {
            const g = revealGen.current;
            const item = g.next();
            if (!item.done) {
                if (item.value) {
                    setHighlightItem(item.value);
                } else {
                    console.log("state.cursor.index", state.cursor.index);
                    setHighlightItem({ teamId: state.teamStates[state.cursor.index].team.id, problemId: null });
                    setState({ ...state });
                }
            }
        }
    }, [state, setState]);

    useEffect(() => {
        document.addEventListener("keydown", handleNextStep);
        return () => document.removeEventListener("keydown", handleNextStep);
    }, [handleNextStep]);

    const scrollRef = useRef<HTMLTableRowElement | null>(null);
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView();
        }
    }, [highlightItem]);

    return (
        <Card
            style={{
                borderColor: "transparent",
                boxShadow: "0 1px 2px -2px rgba(0, 0, 0, 0.16), 0 3px 6px 0 rgba(0, 0, 0, 0.12), 0 5px 12px 4px rgba(0, 0, 0, 0.09)",
            }}
        >
            <table style={{ width: "100%" }}>
                <thead>
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
                </thead>
                <tbody>
                    {state.teamStates.map((team) => {
                        const isHighlighted = highlightItem
                            && highlightItem.teamId === team.team.id;

                        return (
                            <tr
                                key={team.team.id}
                                style={{
                                    border: isHighlighted ? "1px solid blue" : "transparent",
                                }}
                                ref={isHighlighted ? scrollRef : undefined}
                            >
                                <td>
                                    {team.rank}
                                </td>
                                <td>
                                    {team.team.name}
                                </td>
                                <td>
                                    {team.solved}
                                </td>
                                <td>
                                    {Math.floor(team.penalty / 60000)}
                                </td>
                                {team.problemStates.map((p) => {
                                    const isHighlighted = highlightItem
                                        && highlightItem.teamId === team.team.id
                                        && highlightItem.problemId === p.problem.id;

                                    return (
                                        <td key={p.problem.id}>
                                            <span style={{
                                                display: "inline-block",
                                                minWidth: "4em",
                                                minHeight: "1em",
                                                borderRadius: "3px",
                                                backgroundColor: cvtColor(p.state),
                                                border: isHighlighted ? "1px solid blue" : undefined,
                                            }} />
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </Card>
    );
};

export default Board;