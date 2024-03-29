import "./Board.css";

import * as dto from "./dto";
import * as vo from "./vo";
import * as util from "./util";
import { useEventListener, useWindowResize } from "./effects";

import React, { useState, useEffect, useCallback, useRef, useMemo, CSSProperties } from "react";
import FlipMove from "react-flip-move";
import { StickyContainer, Sticky } from "react-sticky";
import { Transition } from "react-transition-group";
import { Tooltip, message } from "antd";
import { WomanOutlined } from "@ant-design/icons";

function cvtColor(problem: vo.ProblemState): string | undefined {
    if (problem.state === vo.ProblemStateKind.Passed) {
        const maxScore = problem.info.score;
        if (maxScore === undefined) {
            return "green";
        }
        if (problem.highestScore === maxScore) {
            return "#33cc33";
        }
        if (problem.highestScore > maxScore * 0.75) {
            return "#cccc00";
        }
        if (problem.highestScore > maxScore * 0.60) {
            return "#cc9900";
        }
        return "#996600";
    }
    if (problem.state === vo.ProblemStateKind.Failed) {
        return "red";
    }
    if (problem.state === vo.ProblemStateKind.Pending) {
        return "#4343ff";
    }
    return undefined;
}

function messageInfo(content: string): void {
    void message.info({ content, className: "info-message", duration: 0.4 });
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

    const [autoReveal, setAutoReveal] = useState<boolean>(options.autoReveal);
    const [speedFactor, setSpeedFactor] = useState<number>(options.speedFactor);

    const [focusIndex, setFocusIndex] = useState<number>(state.cursor.focus);

    const handleNextStep = useCallback(() => {
        console.log(new Date().getTime(), "handleNextStep");
        const prevCursorIdx = state.cursor.index;
        const item = revealGen.current.next();
        setFocusIndex(state.cursor.focus);
        if (state.cursor.index !== prevCursorIdx && state.cursor.index >= 0) {
            const team = state.teamStates[state.cursor.index];
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const element = document.querySelector<HTMLTableRowElement>(`#team-id-${team.info.id}`)!;
            const rect = element.getBoundingClientRect();
            window.scrollTo({ left: 0, top: window.scrollY + rect.top - window.innerHeight / 2, behavior: "smooth" });
        }
        console.log("cursor index = ", state.cursor.index);
        if (!item.done) {
            if (item.value) {
                const value = item.value;
                void (async (): Promise<void> => {
                    console.log("reveal highlight");
                    setKeyLock(true);
                    console.log("locked");
                    setHighlightItem(value);

                    let delay;
                    delay = options.shiningBeforeReveal ? 600 : (autoReveal ? 200 : 0);
                    console.log("delay", delay / speedFactor);
                    await util.delay(delay / speedFactor);  // wait for shining
                    handleNextStep();

                    delay = autoReveal ? (value.passed ? 500 : 200) : (0);
                    console.log("delay", delay / speedFactor);
                    await util.delay(delay / speedFactor); // wait for showing result

                    const team = state.teamStates.find(t => t.info.id === value.teamId);
                    const prevRank = team?.rank;
                    handleNextStep();
                    const curRank = team?.rank;

                    if (prevRank !== curRank) {
                        delay = vo.FLIP_MOVE_DURATION;
                        console.log("delay", delay / speedFactor);
                        await util.delay(delay / speedFactor); // wait for moving up
                    }

                    setKeyLock(false);
                    console.log("unlocked");
                })();
            } else {
                setHighlightItem(null);
            }
        } else {
            setHighlightItem(null);
        }
        setState({ ...state });
        return item.done;
    }, [state, speedFactor, options.shiningBeforeReveal, autoReveal]);

    // useEffect(() => {
    //     if (state.cursor.tick === 0) {
    //         const team = state.teamStates[state.cursor.index];
    //         // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    //         const element = document.querySelector<HTMLTableRowElement>(`#team-id-${team.info.id}`)!;
    //         const dis = element.getBoundingClientRect().top + window.scrollY;
    //         const dur = 10;
    //         let count = 0;
    //         const frame = () => {
    //             window.scrollBy({ left: 0, top: dis / dur / 60, behavior: "auto" });
    //             count += 1;
    //             if (count < dur * 60) {
    //                 window.requestAnimationFrame(frame);
    //             } else {
    //                 setKeyLock(false);
    //             }
    //         };
    //         setKeyLock(true);
    //         setTimeout(() => {
    //             window.requestAnimationFrame(frame);
    //         }, 2000);
    //     }
    // }, [state]);

    useEffect(() => {
        if (state.cursor.tick === 0) {
            const team = state.teamStates[state.cursor.index];
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const element = document.querySelector<HTMLTableRowElement>(`#team-id-${team.info.id}`)!;
            element.scrollIntoView({ behavior: "smooth" });
        }
    }, [state]);

    useEventListener("keydown", useCallback((e: KeyboardEvent) => {
        console.log("keydown", e.key);
        if (e.key === "Enter") {
            if (state.cursor.index < 0) {
                return;
            }
            if (keyLock) {
                return;
            }
            handleNextStep();
        }
        if (e.key === "p") {
            if (autoReveal) {
                console.log("disable autoReveal");
                messageInfo("禁用自动运行");
            } else {
                console.log("enable autoReveal");
                messageInfo("启用自动运行");
            }
            setAutoReveal(a => !a);
        }
        if (e.key === "+") {
            const s = Math.min(speedFactor + 0.5, vo.MAX_SPEED_FACTOR);
            setSpeedFactor(s);
            console.log("speedFactor", s);
            messageInfo(`速度因子：${s.toFixed(1)}`);
        }
        if (e.key === "-") {
            const s = Math.max(speedFactor - 0.5, vo.MIN_SPEED_FACTOR);
            setSpeedFactor(s);
            console.log("speedFactor", s);
            messageInfo(`速度因子：${s.toFixed(1)}`);
        }
        if (e.key === "Control") {
            let s = speedFactor + 3;
            if (s > vo.MAX_SPEED_FACTOR) { s -= vo.MAX_SPEED_FACTOR; }
            if (s < vo.MIN_SPEED_FACTOR) { s = vo.MIN_SPEED_FACTOR; }
            setSpeedFactor(s);
            console.log("speedFactor", s);
            messageInfo(`速度因子：${s.toFixed(1)}`);
        }
    }, [handleNextStep, keyLock, speedFactor, state.cursor, autoReveal]));

    useEventListener("click", useCallback(() => {
        if (state.cursor.index < 0) {
            return;
        }
        if (keyLock) { return; }
        console.log("click");
        handleNextStep();
    }, [handleNextStep, keyLock, state.cursor]));

    useEffect(() => {
        if (state.cursor.tick !== 0 && autoReveal && state.cursor.index >= 0) {
            const timer = util.runInterval(500 / speedFactor, () => {
                if (keyLock) { return; }
                const done = handleNextStep();
                if (done) { timer.stop(); }
            });
            return () => timer.stop();
        }
    }, [state, keyLock, handleNextStep, autoReveal, speedFactor]);

    useEffect(() => {
        if (highlightItem && options.shiningBeforeReveal) {
            setHighlightFlag(f => !f);
            const timer = util.runInterval(400 / speedFactor, () => {
                setHighlightFlag(f => {
                    console.log("flag", !f);
                    return !f;
                });
            });
            return () => timer.stop();
        }
    }, [highlightItem, options, speedFactor]);

    const windowWidth = useWindowResize().width;

    const handleMovingFinished = useCallback(() => {
        setFocusIndex(state.cursor.index);
    }, [state.cursor]);

    return (
        <StickyContainer style={{
            width: "100%",
            backgroundColor: options.darkMode ? "#24292e" : undefined,
        }}>
            <Sticky>
                {({ style }) => (
                    <table
                        className="board-head"
                        style={style}
                    >
                        <thead>
                            <tr
                                style={{
                                    backgroundColor: options.darkMode ? "#24292e" : "white",
                                    color: options.darkMode ? "white" : undefined,
                                }}
                            >
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
                                <th style={{ width: "20%" }}>
                                    Team
                                </th>
                                <th style={{ width: "10%" }}>
                                    Score
                                </th>
                                {data.problems.map(p => (
                                    <th
                                        key={p.id}
                                        style={{
                                            width: `${65 / data.problems.length}%`,
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
                className="board-body"
                duration={vo.FLIP_MOVE_DURATION / speedFactor}
                onFinish={handleMovingFinished}
            >

                {state.teamStates.map((team, idx) => {
                    const isFocused = idx === focusIndex;

                    // const medalColor = (() => {
                    //     if (state.info.medal && options.showMedal) {
                    //         const goldLine = state.info.medal.gold;
                    //         const silverLine = goldLine + state.info.medal.silver;
                    //         const bronzeLine = silverLine + state.info.medal.bronze;
                    //         if (idx < goldLine) {
                    //             return "#fff9c0";
                    //         } else if (idx < silverLine) {
                    //             return "#f6f6f6";
                    //         } else if (idx < bronzeLine) {
                    //             return "#eddccf";
                    //         }
                    //         return undefined;
                    //     }
                    // })();

                    const color = options.darkMode ? "white" : undefined;
                    const boxShadow = options.darkMode ?
                        "0 5px 12px 4px rgba(255, 255, 255, 0.09), 0 -5px 12px 4px rgba(255, 255, 255, 0.09)"
                        : "0 5px 12px 4px rgba(0, 0, 0, 0.09), 0 -5px 12px 4px rgba(0, 0, 0, 0.09)";


                    const whiteBorder = isFocused ? "1px solid transparent" : "1px solid #f0f0f0";
                    const darkBorder = isFocused ? "1px solid #666666" : "none";

                    return (
                        <table
                            key={team.info.id}
                            id={`team-id-${team.info.id}`}
                            className={(isFocused ? "focused-team" : "team")}
                            style={{
                                border: options.darkMode ? (darkBorder) : (whiteBorder),
                                boxShadow: isFocused ? boxShadow : undefined,
                                background: isFocused ? (options.darkMode ? "#24292e" : "white") : undefined
                            }}
                        >
                            <tbody>
                                <tr
                                    style={{
                                        transform: isFocused ? "perspective(65535px) translateZ(1px)" : undefined,
                                        color,
                                    }}
                                >
                                    <td style={{ width: "5%" }}>
                                        {team.info.wildcard ? `*${team.rank}` : team.rank}
                                    </td>
                                    <Tooltip
                                        title={
                                            team.info.userName ?
                                                `${team.info.userName} - ${team.info.name}`
                                                : `${team.info.name}`
                                        }
                                    >
                                        <td
                                            style={{
                                                maxWidth: `${windowWidth * 0.20}px`,
                                                width: "20%",
                                                whiteSpace: "pre-wrap",
                                            }}
                                        >
                                            {(() => {
                                                if (team.info.certifiedName !== undefined) {
                                                    if (team.info.certifiedName !== team.info.name) {
                                                        return (
                                                            <>
                                                                <div>{team.info.name}</div>
                                                                <div>{team.info.certifiedName}</div>
                                                            </>
                                                        );
                                                    }
                                                }
                                                return team.info.name;
                                            })()}
                                            {team.info.gender === "female" ? (<WomanOutlined style={{ color: "pink" }} />) : undefined}
                                        </td>
                                    </Tooltip>
                                    <td style={{ width: "10%" }}>
                                        {`${team.score} - ${Math.round(team.penalty / 60000)}`}
                                    </td>
                                    {team.problemStates.map((p) => {
                                        const isHighlighted = highlightItem
                                            && highlightItem.teamId === team.info.id
                                            && highlightItem.problemId === p.info.id;

                                        const gridInner = (() => {
                                            if (p.state === vo.ProblemStateKind.Untouched) {
                                                return undefined;
                                            }
                                            if (p.state === vo.ProblemStateKind.Passed) {
                                                const penalty = Math.round((p.passTime ?? 0) / 60000) + (p.passIndex ?? 0) * state.info.penaltyTime;
                                                // return `${p.highestScore} - ${penalty}`;
                                                return (
                                                    <>
                                                        <div>{p.highestScore}</div>
                                                        <div>{penalty}</div>
                                                    </>
                                                );
                                            }
                                            return `${p.tryCount}`;
                                        })();

                                        const duration = 400 / speedFactor;

                                        const isFirstSolver = state.firstSolvers[p.info.id] === team.info.id;
                                        const backgroundColor = isFirstSolver ? "#006600" : cvtColor(p);
                                        const color = "white";

                                        const grid = (style: CSSProperties) => (
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    maxWidth: "4em",
                                                    width: "100%",
                                                    minHeight: "1em",
                                                    borderRadius: "0.25em",
                                                    backgroundColor,
                                                    color,
                                                    transition: `opacity ${duration}ms ease-in-out`,
                                                    opacity: 1,
                                                    ...style
                                                }}
                                                ref={isHighlighted ? highlightNodeRef : null}
                                            >
                                                {gridInner}
                                            </span>
                                        );

                                        const transitionStyles = {
                                            entering: { opacity: 0 },
                                            entered: { opacity: 0 },
                                            exiting: { opacity: 1 },
                                            exited: { opacity: 1 },
                                            unmounted: {}
                                        };

                                        const wrappedGrid = isHighlighted ? (
                                            <Transition
                                                in={highlightFlag}
                                                timeout={duration}
                                                nodeRef={highlightNodeRef}
                                            >
                                                {(state) => grid(transitionStyles[state])}
                                            </Transition>
                                        ) : grid({});

                                        return (
                                            <td key={p.info.id} style={{ width: `${65 / team.problemStates.length}%` }}>
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

            <div
                style={{
                    minHeight: "50vh"
                }}
            />
        </StickyContainer>
    );
};

export default Board;