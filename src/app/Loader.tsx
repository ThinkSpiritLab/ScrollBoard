import * as dto from "./dto";
import * as util from "./util";

import React, { useState, useRef, } from "react";
import { Card, Button, Row, Divider, Descriptions, Space, Tag, Col } from "antd";
import { UploadOutlined, PlayCircleOutlined } from "@ant-design/icons";

export interface LoaderProps {
    onLoad: (data: dto.Contest) => void;
    onStart: () => void;
}

const Loader: React.FC<LoaderProps> = ({ onLoad, onStart }: LoaderProps) => {
    const [file, setFile] = useState<File | null>();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [data, setData] = useState<dto.Contest | null>(null);

    const handleLoad = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = e.currentTarget.files?.item(0);
        if (file) {
            setFile(file);
            const content = await util.readFile(file);
            const data = JSON.parse(content) as unknown as dto.Contest; // FIXME: validate
            setData(data);
            onLoad(data);
        }
    };

    return (
        <Card
            style={{
                borderColor: "transparent",
                boxShadow: "0 1px 2px -2px rgba(0, 0, 0, 0.16), 0 3px 6px 0 rgba(0, 0, 0, 0.12), 0 5px 12px 4px rgba(0, 0, 0, 0.09)",
            }}
        >
            <input
                type="file"
                style={{ display: "none" }}
                multiple={false}
                ref={fileInputRef}
                onChange={handleLoad}
            />
            <Row justify="center" style={{ alignItems: "baseline" }}>
                <span style={{ flexGrow: 1, textAlign: "center", margin: "0 1em" }}>
                    {file?.name}
                </span>
                <Button
                    icon={<UploadOutlined />}
                    onClick={(): void => fileInputRef.current?.click()}
                >
                    加载数据
                </Button>
            </Row>
            {data === null ? null : (
                <>
                    <Divider style={{ margin: "1em 0" }} />
                    <Row style={{ marginTop: "1em" }}>
                        <Descriptions
                            column={{ xs: 1, lg: 3 }}
                            title={
                                <span
                                    style={{
                                        display: "inline-block",
                                        width: "100%",
                                        textAlign: "center",
                                        fontSize: "1.5em"
                                    }}
                                >
                                    {data.name}
                                </span>
                            }
                        >
                            <Descriptions.Item label="比赛时长">
                                {data.duration / 60000} 分钟
                            </Descriptions.Item>
                            <Descriptions.Item label="封榜时刻">
                                {data.freezeTime / 60000}  分钟
                            </Descriptions.Item>
                            <Descriptions.Item label="罚时单位">
                                {data.penaltyTime / 60000} 分钟
                            </Descriptions.Item>
                            <Descriptions.Item label="题目数量">
                                {data.problems.length}
                            </Descriptions.Item>
                            <Descriptions.Item label="队伍数量">
                                {data.teams.length}
                            </Descriptions.Item>
                            <Descriptions.Item label="提交数量">
                                {data.submissions.length}
                            </Descriptions.Item>
                            <Descriptions.Item label="题目颜色" span={3}>
                                <Space style={{
                                    display: "inline-flex",
                                    flexWrap: "wrap"
                                }}>
                                    {data.problems.map(p => {
                                        return (
                                            <Tag
                                                key={p.id}
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
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
                                            </Tag>
                                        );
                                    })}
                                </Space>
                            </Descriptions.Item>
                        </Descriptions>
                    </Row>
                    <Row justify="center">
                        <Col span={6} style={{ display: "flex", justifyContent: "center" }}>
                            <Button
                                icon={<PlayCircleOutlined />}
                                onClick={onStart}
                                style={{ width: "100%" }}
                            >
                                开始
                            </Button>
                        </Col>
                    </Row>
                </>
            )}
        </Card>
    );
};

export default Loader;
