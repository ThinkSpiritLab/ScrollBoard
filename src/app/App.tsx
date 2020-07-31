import "antd/dist/antd.css";
import "./App.css";

import * as dto from "./dto";
import Loader from "./Loader";

import React, { useState, } from "react";
import { Row, Col, } from "antd";
import Board from "./Board";

const App: React.FC = () => {
    const [data, setData] = useState<dto.Contest | null>(null);
    const [running, setRunning] = useState(false);

    return (
        <>
            <Row justify="center" style={{ marginTop: "0em" }}>
                <Col span={24} lg={16}>
                    {!running ? (
                        <Loader onLoad={(data) => setData(data)} onStart={() => setRunning(true)} />
                    ) : null}
                </Col>
            </Row>
            <Row justify="center" style={{ width: "calc(100vw - 4px)" }}>
                {(data !== null && running) ? (
                    <Board data={data} />
                ) : null}
            </Row>
            <div style={{ minHeight: "50vh" }}></div>
        </>
    );
};

export default App;
