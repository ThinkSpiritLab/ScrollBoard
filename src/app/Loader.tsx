import * as dto from "./dto";
import * as util from "./util";
import * as vo from "./vo";

import React, { useState, useRef, useEffect, useCallback, } from "react";
import { Card, Button, Row, Divider, Descriptions, Space, Tag, Col, Form, Switch, InputNumber } from "antd";
import { UploadOutlined, PlayCircleOutlined } from "@ant-design/icons";
import * as queryString from "query-string";

export interface LoaderProps {
    onLoad: (data: dto.Contest) => void;
    onStart: (options: vo.BoardOptions) => void;
}

function getRemoteFileUrl(): string | undefined {
    const value = queryString.parse(window.location.search)["data-url"];
    if (typeof value === "string") {
        return value;
    } else {
        return undefined;
    }
}

const Loader: React.FC<LoaderProps> = ({ onLoad, onStart }: LoaderProps) => {
    const [fileName, setFileName] = useState<string | null>();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [data, setData] = useState<dto.Contest | null>(null);

    const handleLoad = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = e.currentTarget.files?.item(0);
        if (file) {
            const content = await util.readFile(file);
            const data = JSON.parse(content) as unknown as dto.Contest; // FIXME: validate
            data.problems.sort((lhs, rhs) => {
                if (lhs.tag !== rhs.tag) {
                    return lhs.tag < rhs.tag ? (-1) : 1;
                }
                return 0;
            });
            setFileName(file.name);
            setData(data);
            onLoad(data);
        }
    };

    useEffect(() => {
        const loadRemote = async (): Promise<void> => {
            const remoteFileUrl: string | undefined = getRemoteFileUrl();
            if (remoteFileUrl) {
                const resp = await fetch(remoteFileUrl);
                const data = await resp.json() as unknown as dto.Contest; // FIXME: validate
                setFileName(remoteFileUrl);
                setData(data);
                onLoad(data);
            }
        };
        loadRemote().catch(err => console.error(err));
    }, [onLoad]);

    const [form] = Form.useForm();

    const handleStart = useCallback(() => {
        const autoReveal = !!form.getFieldValue("autoReveal");
        const shiningBeforeReveal = !!form.getFieldValue("shiningBeforeReveal");
        const speedFactor = parseFloat(form.getFieldValue("speedFactor"));
        const showMedal = (data?.medal !== undefined) && (!!form.getFieldValue("showMedal"));
        const darkMode = !!form.getFieldValue("darkMode");
        onStart({ autoReveal, shiningBeforeReveal, speedFactor, showMedal, darkMode });
    }, [onStart, form, data]);

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
                {(fileName) ? (
                    <span style={{ flexGrow: 1, textAlign: "center", margin: "0 1em" }}>
                        {fileName}
                    </span>
                ) : null}
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
                                <InputNumber
                                    defaultValue={data.freezeTime / 60000}
                                    formatter={(v?: number | string) => `${String(v)}`}
                                    onChange={(v) => data.freezeTime = Number(v) * 60000}
                                    step={10}
                                />
                                分钟
                            </Descriptions.Item>
                            <Descriptions.Item label="罚时单位">
                                {data.penaltyTime} 分钟
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
                    <Row>
                        <Form form={form} style={{ width: "100%" }} layout="inline"
                            initialValues={{ autoReveal: false, shiningBeforeReveal: true, speedFactor: 2, showMedal: true }}
                        >
                            <Form.Item name="autoReveal" label="自动运行" valuePropName="checked">
                                <Switch />
                            </Form.Item>
                            <Form.Item name="shiningBeforeReveal" label="题目闪烁动画" valuePropName="checked">
                                <Switch />
                            </Form.Item>
                            <Form.Item name="speedFactor" label="速度因子">
                                <InputNumber min={vo.MIN_SPEED_FACTOR} max={vo.MAX_SPEED_FACTOR} step={0.1} />
                            </Form.Item>
                            <Form.Item name="darkMode" label="黑暗模式" valuePropName="checked">
                                <Switch />
                            </Form.Item>
                            {/* {data.medal === undefined ? null : (
                                <Form.Item name="showMedal" label="显示奖牌" valuePropName="checked">
                                    <Switch />
                                </Form.Item>
                            )} */}
                        </Form>
                    </Row>
                    <Row justify="center" style={{ marginTop: "1em" }}>
                        <Col span={6} style={{ display: "flex", justifyContent: "center" }}>
                            <Button
                                icon={<PlayCircleOutlined />}
                                onClick={handleStart}
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
