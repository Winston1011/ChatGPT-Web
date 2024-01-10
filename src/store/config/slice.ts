import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { ChatGptConfig } from '@/types'
import { NotificationInfo } from '@/types/admin'

export interface ConfigState {
  // 配置信息
  config: ChatGptConfig
  // 模型
  models: Array<{
    label: string
    value: string
  }>
  // 配置弹窗开关
  configModal: boolean
  // 修改配置弹窗
  setConfigModal: (value: boolean) => void
  // 修改配置
  changeConfig: (config: ChatGptConfig) => void
  notifications: Array<NotificationInfo>
  shop_introduce: string
  user_introduce: string
  invite_introduce: string
  replaceData: (config: { [key: string]: any }) => void
}

const configStore = create<ConfigState>()(
  persist(
    (set) => ({
      configModal: false,
      notifications: [],
      shop_introduce: '',
      user_introduce: '',
      invite_introduce: '',
      models: [],
      config: {
        model: 'gpt-3.5-turbo',
        temperature: 0,
        presence_penalty: 0,
        frequency_penalty: 0,
        max_tokens: 1500
      },
      setConfigModal: (value) => set({ configModal: value }),
      changeConfig: (config) =>
        set((state: ConfigState) => ({
          config: { ...state.config, ...config }
        })),
      replaceData: (data) => set((state: ConfigState) => {
        // 更新models数组，如果ai_models存在于data中
        const newModels = data.ai_models?.models ? data.ai_models.models : state.models;
        // 更新config中的model，如果ai_models.default存在于data中
        const newModel = data.ai_models?.default ? data.ai_models.default : state.config.model;
        // 返回更新后的状态
        return {
          ...state,
          models: newModels,
          config: {
            ...state.config,
            model: newModel
          },
          ...data
        };
      })
    }),
    {
      name: 'config_storage', // name of item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage) // (optional) by default the 'localStorage' is used
    }
  )
)

export default configStore
