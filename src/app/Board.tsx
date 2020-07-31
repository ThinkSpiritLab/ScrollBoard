import * as dto from "./dto";
import * as vo from "./vo";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card } from "antd";
import { Flipper, Flipped } from "react-flip-toolkit";

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

    const handleNextStep = useCallback(() => {
        const g = revealGen.current;
        const item = g.next();
        if (!item.done) {
            if (item.value) {
                setHighlightItem(item.value);
            } else {
                setHighlightItem(null);
            }
            setState({ ...state });
        }
    }, [state, setState]);

    useEffect(() => {
        document.addEventListener("keydown", handleNextStep);
        return () => document.removeEventListener("keydown", handleNextStep);
    }, [handleNextStep]);

    // useEffect(() => {
    //     if (state.cursor.index >= 0) {
    //         const team = state.teamStates[state.cursor.index];
    //         // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    //         const element = document.querySelector(`#team-id-${team.team.id}`)!;
    //         const top = element.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2;
    //         console.log("scrollTo", top, element.getBoundingClientRect().top, window.scrollY, window.innerHeight, element);
    //         window.scrollTo({ left: 0, top, behavior: "smooth" });
    //     }
    // }, [state]);

    return (
        <Card
            style={{
                borderColor: "transparent",
                boxShadow: "0 1px 2px -2px rgba(0, 0, 0, 0.16), 0 3px 6px 0 rgba(0, 0, 0, 0.12), 0 5px 12px 4px rgba(0, 0, 0, 0.09)",
            }}
        >
            <table
                style={{
                    width: "100%",
                    overflowAnchor: "none"
                }}
            >
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
                <Flipper
                    flipKey={state.teamStates.map(t => t.team.id).join(" ")}
                    element="tbody"
                >
                    {state.teamStates.map((team, idx) => {
                        const isFocused = idx === state.cursor.index;

                        return (
                            <Flipped
                                key={team.team.id}
                                flipId={team.team.id}
                            >
                                <tr
                                    id={`team-id-${team.team.id}`}
                                    style={{
                                        border: isFocused ? "1px solid blue" : "transparent",
                                    }}
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
                            </Flipped>
                        );
                    })}
                </Flipper>
            </table>
        </Card>
    );
};

export default Board;