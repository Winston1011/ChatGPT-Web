import { getAdminMessages } from '@/request/adminApi';
import configStore from '@/store/config/slice';
import { MessageInfo } from '@/types/admin';
import { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Button, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Tag } from 'antd';
import { useRef } from 'react';

function MessagePage() {

    const tableActionRef = useRef<ActionType>();
    const columns: ProColumns<MessageInfo>[] = [
        {
            title: 'ID',
            dataIndex: 'id',
            width: 180,
        },
        {
            title: '用户账号',
            width: 180,
            dataIndex: 'user_id',
            render: (_, data) => {
                if (!data.user_id) return '-'
                return (
                    <p>{data.user?.account}</p>
                )
            }
        },
        {
            title: '内容',
            dataIndex: 'content',
        },
        {
            title: '角色',
            dataIndex: 'role',
            width: 130,
            render: (_, data) => <Tag color={data.role.includes('user') ? 'cyan' : 'green'}>{data.role}</Tag>
        },
        {
            title: '模型',
            dataIndex: 'model',
            width: 180,
            render: (_, data) => <Tag color={data.model.includes('gpt-4') ? 'purple' : ''}>{data.model}</Tag>
        },
        {
            title: '会话ID',
            dataIndex: 'parent_message_id',
            render: (_, data) => <Tag>{data.parent_message_id}</Tag>
        },
        {
            title: '状态值',
            dataIndex: 'status',
            width: 100,
            render: (_, data) => <Tag color={data.status ? 'red' : 'green'}>{data.status ? '异常' : '正常'}</Tag>
        },
        {
            title: '创建时间',
            width: 200,
            dataIndex: 'create_time',
        },
        {
            title: '更新时间',
            width: 200,
            dataIndex: 'update_time',
        },
    ];

    const [searchForm] = Form.useForm()
    const handleSearch = () => {
        const searchValues = searchForm.getFieldsValue()
        tableActionRef.current?.reloadAndRest?.()
    }
    const modelsAll = configStore.getState().models;

    return (
        <div>
            <Form form={searchForm} onFinish={handleSearch}>
                <Row gutter={24}>
                    <Col>
                        <Form.Item name="account" label="账户">
                            <Input placeholder="输入账号,支持关键词" />
                        </Form.Item>
                    </Col>
                    <Col>
                        <Form.Item name="createTimeRange" label="消息产生时间">
                            <DatePicker.RangePicker
                                placeholder={['起始时间', '结束时间']}
                                allowClear
                            />
                        </Form.Item>
                    </Col>
                    <Col>
                        <Form.Item name="modelName" label="模型">
                            <Select placeholder="选择模型名称"
                                mode="multiple"
                                allowClear
                                style={{ width: '200px' }}
                                popupMatchSelectWidth={false}
                            >
                                {modelsAll.map((modelItem) => (
                                    <Select.Option key={modelItem.value} value={modelItem.value}>
                                        {modelItem.value}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>

                    <Col>
                        <Form.Item>
                            <Button type="primary" htmlType="submit">
                                确认
                            </Button>
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
            <ProTable
                actionRef={tableActionRef}
                columns={columns}
                scroll={{
                    x: 1800
                }}
                request={async (params, sorter, filter) => {
                    const searchValues = searchForm.getFieldsValue()

                    // 将搜索值添加到请求参数中
                    const queryParams = {
                        ...searchValues,
                        page: params.current || 1,
                        page_size: params.pageSize || 10
                    }

                    console.log('queryParams.modelName', queryParams.modelName)
                    // 表单搜索项会从 params 传入，传递给后端接口。
                    const res = await getAdminMessages({
                        page: queryParams.page || 1,
                        page_size: queryParams.page_size || 10,
                        account: queryParams.account ?? '',
                        createTimeStart: (queryParams.createTimeRange !== undefined && queryParams.createTimeRange !== null) ?
                            `${queryParams.createTimeRange[0].$y}-${queryParams.createTimeRange[0].$M + 1}-${queryParams.createTimeRange[0].$D}`
                            : '',
                        createTimeEnd: (queryParams.createTimeRange !== undefined && queryParams.createTimeRange !== null) ?
                            `${queryParams.createTimeRange[1].$y}-${queryParams.createTimeRange[1].$M + 1}-${queryParams.createTimeRange[1].$D}`
                            : '',
                        modelName: (queryParams.modelName !== undefined) ? queryParams.modelName : [],
                    });
                    return Promise.resolve({
                        data: res.data.rows,
                        total: res.data.count,
                        success: true,
                    });
                }}
                toolbar={{
                    actions: [],
                }}
                rowKey="id"
                search={false}
                bordered
            />
        </div>
    )
}

export default MessagePage;