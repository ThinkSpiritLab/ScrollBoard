import * as dto from "./dto";
import * as vo from "./vo";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card } from "antd";
import { Flipper, Flipped } from "react-flip-toolkit";
import { StickyContainer, Sticky } from "react-sticky";

function cvtColor(state: vo.ProblemStateKind): string | undefined {
    if (state === vo.ProblemStateKind.Passed) {
        return "green";
    }
    if (state === vo.ProblemStateKind.Failed) {
        return "red";
    }
    if (state === vo.ProblemStateKind.Pending) {
        return "orange";
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
        const prevCursorIdx = state.cursor.index;
        const item = revealGen.current.next();
        if (state.cursor.index !== prevCursorIdx && state.cursor.index >= 0) {
            const team = state.teamStates[state.cursor.index];
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const element = document.querySelector<HTMLTableRowElement>(`#team-id-${team.team.id}`)!;
            const rect = element.getBoundingClientRect();
            window.scrollTo({ left: 0, top: window.scrollY + rect.top - window.innerHeight / 2, behavior: "smooth" });
        }
        if (!item.done) {
            if (item.value) {
                setHighlightItem(item.value);
            } else {
                setHighlightItem(null);
            }
        } else {
            setHighlightItem(null);
        }
        setState({ ...state });
        return item.done;
    }, [state, setState]);

    useEffect(() => {
        if (state.cursor.index + 1 === state.teamStates.length) {
            const team = state.teamStates[state.cursor.index];
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const element = document.querySelector<HTMLTableRowElement>(`#team-id-${team.team.id}`)!;
            element.scrollIntoView({ behavior: "smooth" });
        }
    }, [state]);

    useEffect(() => {
        // document.addEventListener("keydown", handleNextStep);
        // return () => document.removeEventListener("keydown", handleNextStep);
        const timer = setInterval(() => {
            const done = handleNextStep();
            if (done) { clearInterval(timer); }
        }, 500);
        return () => clearInterval(timer);
    }, [handleNextStep]);

    return (
        <StickyContainer style={{ width: "100%" }}>
            <Sticky>
                {({ style }) => (
                    <table
                        style={{
                            width: "100%",
                            fontSize: "2em",
                            textAlign: "center",
                            backgroundColor: "white",
                            zIndex: 1024,
                            boxShadow: "0 5px 8px 4px rgba(0, 0, 0, 0.09)",
                            ...style
                        }}
                    >
                        <thead>
                            <tr >
                                <th style={{ width: "5%" }}>
                                    Rank
                                </th>
                                <th style={{ width: "25%" }}>
                                    Team
                                </th>
                                <th style={{ width: "10%" }}>
                                    Score
                                </th>
                                {data.problems.map(p => (
                                    <th
                                        key={p.id}
                                        style={{
                                            width: `${60 / data.problems.length}%`,
                                        }}
                                    >
                                        <span
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center"
                                            }}
                                        >
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
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                    </table>
                )}
            </Sticky>
            <div
                style={{
                    width: "100%",
                    borderColor: "transparent",
                }}
            >
                <table
                    style={{
                        width: "100%",
                        overflowAnchor: "none",
                        fontSize: "2em",
                        textAlign: "center",
                    }}
                >
                    <Flipper
                        flipKey={state.teamStates.map(t => t.team.id).join(" ")}
                        element="tbody"
                        // staggerConfig={{ default: { speed: 0.001 } }}
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
                                            boxShadow:
                                                isFocused ?
                                                    "0 5px 12px 4px rgba(0, 0, 0, 0.09), 0 -5px 12px 4px rgba(0, 0, 0, 0.09)"
                                                    : undefined
                                        }}
                                    >
                                        <td style={{ width: "5%" }}>
                                            {team.rank}
                                        </td>
                                        <td style={{ width: "25%" }}>
                                            {team.team.name}
                                        </td>
                                        <td style={{ width: "10%" }}>
                                            {`${team.solved} - ${Math.floor(team.penalty / 60000)}`}
                                        </td>
                                        {team.problemStates.map((p) => {
                                            const isHighlighted = highlightItem
                                                && highlightItem.teamId === team.team.id
                                                && highlightItem.problemId === p.problem.id;

                                            return (
                                                <td key={p.problem.id} style={{ width: `${60 / team.problemStates.length}%` }}>
                                                    <span style={{
                                                        display: "inline-block",
                                                        minWidth: "4em",
                                                        minHeight: "1em",
                                                        borderRadius: "0.25em",
                                                        backgroundColor: cvtColor(p.state),
                                                        border: isHighlighted ? "1px solid blue" : undefined,
                                                        color: "white",
                                                    }} >
                                                        {p.state === vo.ProblemStateKind.Passed ?
                                                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                                            `${p.tryCount} - ${Math.floor(p.acceptTime! / 60000)}`
                                                            : `${p.tryCount}`
                                                        }
                                                    </span>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </Flipped>
                            );
                        })}
                    </Flipper>
                </table>
            </div >
        </StickyContainer>
    );
};

export default Board;