import { FileAddOutlined } from "@ant-design/icons";
import { ActionBtn } from "@app/components/common/Common.styles";
import Layout from "@app/components/layout/Layout";
import { Col, Row, Form, Input } from "antd";
import React, { useEffect, useState } from "react";
import { GlobalHotKeys } from "react-hotkeys";
import { useDispatch, useSelector } from "react-redux";
import actions from "@app/redux/settings/actions";
import actionType from "../../constants/actionType";
import TextArea from "antd/lib/input/TextArea";
import { ButtonDiv, UsersDiv } from "../../components/common/container.style";
const formItemLayout = {
    labelCol: {
        xs: { span: 24 },
        sm: { span: 8 },
    },
    wrapperCol: {
        xs: { span: 24 },
        sm: { span: 16 },
    },
};
const Index: React.FC = () => {
    const [form] = Form.useForm();
    const { rows } = useSelector((state: any) => state?.settings);
    const [settings, setSettings] = useState([])
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(actions.getData({}));
    }, [dispatch]);

    useEffect(() => {
        setSettings(rows ?? []);
        if (!rows?.length) return;
        const fields: Record<string, unknown> = {};
        rows.forEach((r) => {
            fields[r.settingKey] = r.settingValue;
        });
        form.setFieldsValue(fields);
    }, [rows, form]);

    const handleSubmit = () => {
        dispatch(actions.saveInto({
            items: settings
        }, actionType.UPDATE));
    }

    const Actions = () => {
        return (
            <>
                <ButtonDiv>
                    <ActionBtn
                        type="primary"
                        icon={<FileAddOutlined />}
                        onClick={handleSubmit}
                    >
                        Save
                    </ActionBtn>
                </ButtonDiv>
            </>
        );
    };

    return (
        <Layout title="sidebar.Categories">
            <GlobalHotKeys
                keyMap={{ SEARCH_CATEGORIES: "ctrl+alt+f" }}
                handlers={{
                    SEARCH_CATEGORIES: (e: any) => {
                        e.preventDefault();


                    },
                }}
                allowChanges={true}
            >
            </GlobalHotKeys>
            <UsersDiv>
                <Form
                    form={form}
                    layout="horizontal"
                    labelCol={{ flex: "140px !important" }}
                    style={{ width: "100%" }}
                >
                    <Form.Item name="disableAutoComplete" style={{ display: "none" }}>
                        <Input autoComplete="off" name="cp" />
                    </Form.Item>
                    <Row>
                        <Col lg={24} md={24} xs={24}>
                            {settings && settings.map((r) => {
                                return <Row gutter={10}>
                                    <Col lg={16} md={16} sm={24} xs={24}>
                                        <Form.Item
                                            {...formItemLayout}
                                            name={r.settingKey}
                                            className="break-line"
                                            initialValue={'' +r.settingValue}
                                            // rules={[{ required: true, message: intl.formatMessage({ id: 'form.error.short.Required' }) }]}
                                            label={r.settingLable}
                                        >
                                            {
                                                r.settingType === "TEXT" ? <Input type={'text'} maxLength={200} allowClear
                                                    onChange={(e) => {
                                                        const nRows = [...settings];
                                                        nRows.map((rr, ii) => {
                                                            if (rr.settingKey === r.settingKey) {
                                                                rr.settingValue = e.target.value
                                                            }
                                                            return rr
                                                        })
                                                        setSettings(nRows)
                                                    }} /> : r.settingType === "AREA" ? <TextArea maxLength={200} allowClear
                                                        onChange={(e) => {
                                                            const nRows = [...settings];
                                                            nRows.map((rr, ii) => {
                                                                if (rr.settingKey === r.settingKey) {
                                                                    rr.settingValue = e.target.value
                                                                }
                                                                return rr
                                                            })
                                                            setSettings(nRows)
                                                        }} /> : null
                                            }

                                        </Form.Item>
                                    </Col>
                                </Row>
                            })}
                        </Col>
                    </Row>
                    <Row>
                        <Col
                            xs={24}
                            sm={24}
                            md={24}
                            lg={24}
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                flexDirection: "row",
                                alignItems: "flex-end",
                            }}
                        >
                            <Actions />
                        </Col>
                    </Row>
                </Form>
            </UsersDiv>
        </Layout>
    );
};
export default Index;
