import {
  ProForm,
  ProFormDigit,
  ProFormGroup,
  ProFormList,
  ProFormText,
  QueryFilter,
  ProFormSelect,
} from '@ant-design/pro-components'
import { Button, Form, Space, Tabs, message } from 'antd'
import { useEffect, useRef, useState } from 'react'
import styles from './index.module.less'
import { getAdminConfig, putAdminConfig } from '@/request/adminApi'
import { ConfigInfo } from '@/types/admin'
import { CloseCircleOutlined, SmileOutlined } from '@ant-design/icons'
import RichEdit from '@/components/RichEdit'

function ConfigPage() {
  const [configs, setConfigs] = useState<Array<ConfigInfo>>([])
  const [rewardForm] = Form.useForm<{
    register_reward: number | string
    signin_reward: number | string
    invite_reward: number | string
  }>()

  const [historyMessageForm] = Form.useForm<{
    history_message_count: number | string
  }>()

  const [aiRatioForm] = Form.useForm<{
    ai3_ratio: number | string
    ai3_16k_ratio: number | string
    ai4_ratio: number | string
    ai4_32k_ratio: number | string
    ai4_vision_ratio: number | string
  }>()

  const [drawUsePriceForm] = Form.useForm<{
    draw_use_price: Array<{
      size: string
      integral: number
    }>
  }>()

  const [gosSettingsForm] = Form.useForm<{
    gos_settings: Array<{
      imageHostingType: string
      secretId: string
      secretKey: string
      bucketName: string
      region: string
      accelerateDomain: string
    }>
  }>()

  const shopIntroduce = useRef<string>()
  const userIntroduce = useRef<string>()
  const inviteIntroduce = useRef<string>()

  function getConfigValue(key: string, data: Array<ConfigInfo>) {
    const value = data.filter((c) => c.name === key)[0]
    return value
  }

  function onRewardFormSet(data: Array<ConfigInfo>) {
    const registerRewardInfo = getConfigValue('register_reward', data)
    const signinRewardInfo = getConfigValue('signin_reward', data)
    const historyMessageCountInfo = getConfigValue('history_message_count', data)
    const ai3Ratio = getConfigValue('ai3_ratio', data)
    const ai316kRatio = getConfigValue('ai3_16k_ratio', data)
    const ai4Ratio = getConfigValue('ai4_ratio', data)
    const ai432kRatio = getConfigValue('ai4_32k_ratio', data)
    const ai4VisionRatio = getConfigValue('ai4_vision_ratio', data)
    const drawUsePrice = getConfigValue('draw_use_price', data)
    const invite_reward = getConfigValue('invite_reward', data)
    const gosSettings = getConfigValue('gos_settings', data)
    rewardForm.setFieldsValue({
      register_reward: registerRewardInfo.value,
      signin_reward: signinRewardInfo.value,
      invite_reward: invite_reward.value
    })
    historyMessageForm.setFieldsValue({
      history_message_count: Number(historyMessageCountInfo.value)
    })
    aiRatioForm.setFieldsValue({
      ai3_ratio: Number(ai3Ratio.value),
      ai3_16k_ratio: Number(ai316kRatio.value),
      ai4_ratio: Number(ai4Ratio.value),
      ai4_32k_ratio: Number(ai432kRatio.value),
      ai4_vision_ratio:Number(ai4VisionRatio.value)
    })
    if (drawUsePrice && drawUsePrice.value) {
      drawUsePriceForm.setFieldsValue({
        draw_use_price: JSON.parse(drawUsePrice.value)
      })
    }
    else {
      const drawUsePriceInitData = {
        draw_use_price: [
          {
            size: '1024x1024',
            integral: 160
          },
          {
            size: '1024x1792',
            integral: 200
          },
          {
            size: '1792x1024',
            integral: 200
          }
        ]
      }
      drawUsePriceForm.setFieldsValue(drawUsePriceInitData)
      onSave({
        draw_use_price: JSON.stringify(drawUsePriceInitData.draw_use_price)
      })
    }

    const shop_introduce = getConfigValue('shop_introduce', data)
    if (shop_introduce && shop_introduce.value) {
      shopIntroduce.current = shop_introduce.value
    }

    const user_introduce = getConfigValue('user_introduce', data)
    if (user_introduce && user_introduce.value) {
      userIntroduce.current = user_introduce.value
    }

    const invite_introduce = getConfigValue('invite_introduce', data)
    if (invite_introduce && invite_introduce.value) {
      inviteIntroduce.current = invite_introduce.value
    }

    if (gosSettings && gosSettings.value) {
      gosSettingsForm.setFieldsValue({
        gos_settings: JSON.parse(gosSettings.value)
      })
    }

  }

  function onGetConfig() {
    getAdminConfig().then((res) => {
      if (res.code) {
        message.error('获取配置错误')
        return
      }
      onRewardFormSet(res.data)
      setConfigs(res.data)
    })
  }

  useEffect(() => {
    onGetConfig()
  }, [])

  async function onSave(values: any) {
    return putAdminConfig(values).then((res) => {
      if (res.code) {
        message.error('保存失败')
        return
      }
      message.success('保存成功')
      onGetConfig()
    })
  }

  function IntroduceSettings() {
    return (
      <Space
        direction="vertical"
        style={{
          width: '100%'
        }}
      >
        <div className={styles.config_form}>
          <h3>商城页面公告设置</h3>
          <div style={{ marginTop: 20, marginBottom: 20 }}>
            <RichEdit
              defaultValue={shopIntroduce.current}
              value={shopIntroduce.current}
              onChange={(value) => {
                shopIntroduce.current = value
              }}
            />
          </div>
          <Button
            size="large"
            type="primary"
            onClick={() => {
              onSave({
                shop_introduce: shopIntroduce.current
              })
            }}
          >
            保 存
          </Button>
        </div>
        <div className={styles.config_form}>
          <h3>个人中心页面公告设置</h3>
          <div style={{ marginTop: 20, marginBottom: 20 }}>
            <RichEdit
              defaultValue={userIntroduce.current}
              value={userIntroduce.current}
              onChange={(value) => {
                userIntroduce.current = value
              }}
            />
          </div>
          <Button
            size="large"
            type="primary"
            onClick={() => {
              onSave({
                user_introduce: userIntroduce.current
              })
            }}
          >
            保 存
          </Button>
        </div>
        <div className={styles.config_form}>
          <h3>邀请说明设置</h3>
          <div style={{ marginTop: 20, marginBottom: 20 }}>
            <RichEdit
              defaultValue={inviteIntroduce.current}
              value={inviteIntroduce.current}
              onChange={(value) => {
                inviteIntroduce.current = value
              }}
            />
          </div>
          <Button
            size="large"
            type="primary"
            onClick={() => {
              onSave({
                invite_introduce: inviteIntroduce.current
              })
            }}
          >
            保 存
          </Button>
        </div>
      </Space>
    )
  }

  
  function RewardSettings() {
    return (
      <Space
        direction="vertical"
        style={{
          width: '100%'
        }}
      >
        <div className={styles.config_form}>
          <h3>奖励激励</h3>
          <QueryFilter
            autoFocus={false}
            autoFocusFirstInput={false}
            form={rewardForm}
            onFinish={async (values: any) => {
              putAdminConfig(values).then((res) => {
                if (res.code) {
                  message.error('保存失败')
                  return
                }
                message.success('保存成功')
                onGetConfig()
              })
            }}
            onReset={() => {
              onRewardFormSet(configs)
            }}
            size="large"
            collapsed={false}
            defaultCollapsed={false}
            requiredMark={false}
            defaultColsNumber={79}
            searchText="保存"
            resetText="恢复"
          >
            <ProFormDigit
              name="register_reward"
              label="注册奖励"
              tooltip="新用户注册赠送积分数量"
              min={0}
              max={100000}
            />
            <ProFormDigit
              name="signin_reward"
              label="签到奖励"
              tooltip="每日签到赠送积分数量"
              min={0}
              max={100000}
            />
            <ProFormDigit
              name="invite_reward"
              label="邀请奖励"
              tooltip="每邀请一位新用户注册奖励积分数"
              min={0}
              max={100000}
            />
          </QueryFilter>
        </div>
        <div className={styles.config_form}>
          <h3>历史记录</h3>
          <QueryFilter
            autoFocus={false}
            autoFocusFirstInput={false}
            form={historyMessageForm}
            onFinish={onSave}
            onReset={() => {
              onRewardFormSet(configs)
            }}
            size="large"
            collapsed={false}
            defaultCollapsed={false}
            requiredMark={false}
            defaultColsNumber={79}
            searchText="保存"
            resetText="恢复"
          >
            <ProFormDigit
              name="history_message_count"
              label="携带数量"
              tooltip="会话上下文携带对话数量"
              min={1}
              max={100000}
            />
          </QueryFilter>
        </div>
        <div className={styles.config_form}>
          <h3>对话积分</h3>
          <p>
          设置一次对话消耗几积分
          </p>
          <QueryFilter
            autoFocus={false}
            autoFocusFirstInput={false}
            form={aiRatioForm}
            onFinish={onSave}
            onReset={() => {
              onRewardFormSet(configs)
            }}
            size="large"
            collapsed={false}
            defaultCollapsed={false}
            requiredMark={false}
            defaultColsNumber={79}
            searchText="保存"
            resetText="恢复"
          >
            <ProFormDigit
              name="ai3_ratio"
              label="GPT3-4K"
              tooltip="每次对话消耗多少积分"
              min={0}
              max={100000}
            />
            <ProFormDigit
              name="ai3_16k_ratio"
              label="GPT3-16K"
              tooltip="每次对话消耗多少积分"
              min={0}
              max={100000}
            />
            <ProFormDigit
              name="ai4_ratio"
              label="GPT4"
              tooltip="每次对话消耗多少积分"
              min={0}
              max={100000}
            />
            <ProFormDigit
              name="ai4_32k_ratio"
              label="GPT4-32K"
              tooltip="每次对话消耗多少积分"
              min={0}
              max={100000}
            />
            <ProFormDigit
              name="ai4_vision_ratio"
              label="GPT-4-V"
              tooltip="每次对话消耗多少积分"
              min={0}
              max={100000}
            />
          </QueryFilter>
        </div>
        <div className={styles.config_form}>
          <h3>绘画积分扣除设置</h3>
          <p>分为三个规格 1024x1024 1024x1792 1792x1024 请分别设置, 如为设置则不扣除积分。</p>
          <ProForm
            form={drawUsePriceForm}
            onFinish={(values) => {
              values.draw_use_price = JSON.stringify(values.draw_use_price) as any
              return onSave(values)
            }}
            onReset={() => {
              onRewardFormSet(configs)
            }}
            size="large"
            requiredMark={false}
            isKeyPressSubmit={false}
            submitter={{
              searchConfig: {
                submitText: '保存',
                resetText: '恢复'
              }
            }}
          >
            <ProFormList
              creatorButtonProps={{
                creatorButtonText: '添加绘画规格扣除项'
              }}
              name="draw_use_price"
              min={1}
              max={3}
            >
              <ProFormGroup key="group">
                <ProFormText
                  name="size"
                  label="规格大小"
                  rules={[
                    {
                      required: true
                    }
                  ]}
                />
            <ProFormDigit
                  name="integral"
                  label="消耗积分"
                  min={0}
                  max={100000}
                  rules={[
                    {
                      required: true
                    }
                  ]}
            />
              </ProFormGroup>
            </ProFormList>
          </ProForm>
        </div>
        <div className={styles.config_form}>
          <h3>存储配置</h3>
          <p>暂时只支持谷歌云 GOS</p>
          <ProForm
            form={gosSettingsForm}
            onFinish={(values) => {
              values.gos_settings = JSON.stringify(values.gos_settings) as any
              return onSave(values)
            }}
            onReset={() => {
              onRewardFormSet(configs)
            }}
            size="large"
            requiredMark={false}
            isKeyPressSubmit={false}
            submitter={{
              searchConfig: {
                submitText: '保存',
                resetText: '恢复'
              }
            }}
          >
            <ProFormGroup>
              <ProFormSelect
                name={['gos_settings', 'imageHostingType']}
                label="图床类型"
                options={[
                  { value: 'google cloud storage', label: '谷歌云' },
                ]}
                rules={[{ required: true, message: '请选择图床类型' }]}
              />
              <ProFormText
                name={['gos_settings', 'secretId']}
                label="SecretId"
                rules={[
                  {
                    // required: true,
                    message: '请输入SecretId'
                  }
                ]}
              />
              <ProFormText.Password
                name={['gos_settings', 'secretKey']}
                label="SecretKey"
                rules={[
                  {
                    // required: true,
                    message: '请输入SecretKey'
                  }
                ]}
              />
              <ProFormText
                name={['gos_settings', 'bucketName']}
                label="存储桶名称"
                rules={[
                  {
                    required: true,
                    message: '请输入存储桶名称'
                  }
                ]}
              />
              <ProFormText
                name={['gos_settings', 'region']}
                label="所属地域"
                rules={[
                  {
                    // required: true,
                    message: '请选择所属地域'
                  }
                ]}
              />
              <ProFormText
                name={['gos_settings', 'accelerateDomain']}
                label="全球加速域名"
              />
            </ProFormGroup>
          </ProForm>
        </div>
      </Space>
    )
  }

  return (
    <div className={styles.config}>
      <Tabs
        defaultActiveKey="WebSiteSettings"
        // centered
        // type="card"
        items={[
          // {
          //   label: '网站设置',
          //   key: 'WebSiteSettings',
          //   children: <WebSiteSettings />
          // },
          {
            label: '奖励设置',
            key: 'RewardSettings',
            children: <RewardSettings />
          },
          {
            label: '页面说明设置',
            key: 'IntroduceSettings',
            children: <IntroduceSettings />
          },
          // {
          //   label: '违禁词审核设置',
          //   key: 'ReviewProhibitedWordsSettings',
          //   children: <ReviewProhibitedWordsSettings />
          // }
        ]}
      />
    </div>
  )
}
export default ConfigPage
