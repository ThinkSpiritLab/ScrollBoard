import "./Board.css";

import * as dto from "./dto";
import * as vo from "./vo";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import FlipMove from "react-flip-move";
import { StickyContainer, Sticky } from "react-sticky";
import { CSSTransition } from "react-transition-group";

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
    options: vo.BoardOptions;
}

const Board: React.FC<BoardProps> = ({ data, options }: BoardProps) => {

    const [state, setState] = useState<vo.ContestState>(useMemo(() => vo.calcContestState(data), [data]));

    const [highlightItem, setHighlightItem] = useState<vo.HighlightItem | null>(null);

    const revealGen = useRef<vo.RevealGen>(vo.reveal(state));

    const highlightNodeRef = useRef<HTMLSpanElement | null>(null);

    const [highlightFlag, setHighlightFlag] = useState<boolean>(false);

    const [keyLock, setKeyLock] = useState<boolean>(false);

    const handleNextStep = useCallback(() => {
        console.log("handleNextStep");
        const prevCursorIdx = state.cursor.index;
        const item = revealGen.current.next();
        if (state.cursor.index !== prevCursorIdx && state.cursor.index >= 0) {
            const team = state.teamStates[state.cursor.index];
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const element = document.querySelector<HTMLTableRowElement>(`#team-id-${team.team.id}`)!;
            const rect = element.getBoundingClientRect();
            window.scrollTo({ left: 0, top: window.scrollY + rect.top - window.innerHeight / 2, behavior: "smooth" });
        }
        console.log("cursor index = ", state.cursor.index);
        if (!item.done) {
            if (item.value) {
                console.log("reveal highlight");
                setKeyLock(true);
                setHighlightItem(item.value);
                setTimeout(() => handleNextStep(), 1200);
                setTimeout(() => {
                    handleNextStep();
                    setKeyLock(false);
                    console.log("unlocked");
                }, 1500 + (item.value.accepted ? 500 : 0));
            } else {
                setHighlightItem(null);
            }
        } else {
            setHighlightItem(null);
        }
        setState({ ...state });
        return item.done;
    }, [state]);

    useEffect(() => {
        if (state.cursor.tick === 0) {
            const team = state.teamStates[state.cursor.index];
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const element = document.querySelector<HTMLTableRowElement>(`#team-id-${team.team.id}`)!;
            const dis = element.getBoundingClientRect().top + window.scrollY;
            const dur = 10;
            let count = 0;
            const frame = () => {
                window.scrollBy({ left: 0, top: dis / dur / 60, behavior: "auto" });
                count += 1;
                if (count < dur * 60) {
                    window.requestAnimationFrame(frame);
                } else {
                    setKeyLock(false);
                }
            };
            setKeyLock(true);
            setTimeout(() => {
                window.requestAnimationFrame(frame);
            }, 2000);
        }
    }, [state]);

    const handleKeydown = useCallback((e: KeyboardEvent) => {
        if (keyLock) {
            return;
        }
        console.log("keydown");
        e.preventDefault();
        e.stopPropagation();
        if (e.key === "Enter") {
            handleNextStep();
        }
    }, [handleNextStep, keyLock]);

    useEffect(() => {
        document.addEventListener("keydown", handleKeydown);
        return () => document.removeEventListener("keydown", handleKeydown);

    }, [handleKeydown]);

    useEffect(() => {
        if (state.cursor.tick !== 0 && options.autoReveal) {
            const timer = setInterval(() => {
                if (keyLock) { return; }
                const done = handleNextStep();
                if (done) { clearInterval(timer); }
            }, 500);
            return () => clearInterval(timer);
        }
    }, [state, keyLock, handleNextStep, options]);

    useEffect(() => {
        if (highlightItem) {
            const timer = setInterval(() => {
                setHighlightFlag(!highlightFlag);
            }, 400);
            return () => clearInterval(timer);
        }
    }, [highlightItem, highlightFlag]);

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
                            <tr>
                                <th style={{ width: "5%" }}>
                                    <span
                                        style={{
                                            position: "absolute", zIndex: 2048, top: 0, left: 0,
                                            borderRadius: "50%", width: "6px", height: "6px",
                                            backgroundColor: keyLock ? "#ff4d4f" : "#52c41a"
                                        }}
                                    />
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

            <FlipMove
                style={{
                    width: "100%",
                    overflowAnchor: "none",
                    fontSize: "2em",
                    textAlign: "center",
                }}
                duration={2000}
            >

                {state.teamStates.map((team, idx) => {
                    const isFocused = idx === state.cursor.index;

                    return (
                        <table
                            key={team.team.id}
                            id={`team-id-${team.team.id}`}
                            style={{
                                width: "100%",
                                boxShadow:
                                    isFocused ?
                                        "0 5px 12px 4px rgba(0, 0, 0, 0.09), 0 -5px 12px 4px rgba(0, 0, 0, 0.09)"
                                        : undefined
                            }}
                        >
                            <tbody>
                                <tr>
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

                                        const grid = (
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    minWidth: "4em",
                                                    minHeight: "1em",
                                                    borderRadius: "0.25em",
                                                    backgroundColor: cvtColor(p.state),
                                                    color: "white",
                                                }}
                                                ref={isHighlighted ? highlightNodeRef : null}
                                            >
                                                {p.state === vo.ProblemStateKind.Passed ?
                                                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                                    `${p.tryCount} - ${Math.floor(p.acceptTime! / 60000)}`
                                                    : `${p.tryCount}`
                                                }
                                            </span>
                                        );

                                        const wrappedGrid = isHighlighted ? (
                                            <CSSTransition
                                                in={highlightFlag}
                                                timeout={400}
                                                classNames="problem-grid"
                                                nodeRef={highlightNodeRef}
                                            >
                                                {grid}
                                            </CSSTransition>
                                        ) : grid;

                                        return (
                                            <td key={p.problem.id} style={{ width: `${60 / team.problemStates.length}%` }}>
                                                {wrappedGrid}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tbody>
                        </table>
                    );
                })}
            </FlipMove>
        </StickyContainer>
    );
};

export default Board;