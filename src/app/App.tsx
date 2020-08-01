import "antd/dist/antd.css";
import "./App.css";

import * as dto from "./dto";
import * as vo from "./vo";
import Loader from "./Loader";

import React, { useState, useCallback, } from "react";
import { Row, Col, } from "antd";
import Board from "./Board";

const App: React.FC = () => {
    const [data, setData] = useState<dto.Contest | null>(null);
    const [options, setOptions] = useState<vo.BoardOptions | null>(null);

    const [running, setRunning] = useState(false);

    const handleStart = useCallback((options) => {
        setRunning(true);
        setOptions(options);
        console.debug(data, options);
    }, [data]);

    return (
        <>
            {!running ? (
                <Row justify="center" style={{ marginTop: "0em", alignItems: "center", minHeight: "80vh" }}>
                    <Col span={24} lg={16}>
                        <Loader onLoad={(data) => setData(data)} onStart={handleStart} />
                    </Col>
                </Row>
            ) : null}
            {(data !== null && running) ? (
                <>
                    <Row justify="center" style={{ width: "calc(100vw - 4px)" }}>
                        {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
                        <Board data={data} options={options!} />
                    </Row>
                    <div style={{ minHeight: "50vh" }}></div>
                </>
            ) : null}
        </>
    );
};

export default App;
