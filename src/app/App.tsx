import "antd/dist/antd.css";

import * as dto from "./dto";
import Loader from "./Loader";

import React, { useState, } from "react";
import { Row, Col, } from "antd";
import Board from "./Board";

const App: React.FC = () => {
    const [data, setData] = useState<dto.Contest | null>(null);

    const loader = (
        <Loader onLoad={(data) => setData(data)} onStart={() => console.log(data)} />
    );

    return (
        <>
            <Row justify="center" style={{ marginTop: "0em" }}>
                <Col span={24} lg={16}>
                    {loader}
                    {data === null ? null : (
                        <Board data={data} />
                    )}
                </Col>
            </Row>
        </>
    );
};

export default App;
