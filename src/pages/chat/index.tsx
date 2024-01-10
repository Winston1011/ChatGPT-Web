/* eslint-disable no-prototype-builtins */
/* eslint-disable no-console */
import { CommentOutlined, DeleteOutlined , UploadOutlined} from '@ant-design/icons'
import { Button, Modal, Popconfirm, Space, Tabs, Select, message ,Upload, UploadFile, Radio, RadioChangeEvent} from 'antd'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import styles from './index.module.less'
import { chatStore, configStore, userStore } from '@/store'
import RoleNetwork from './components/RoleNetwork'
import RoleLocal from './components/RoleLocal'
import AllInput from './components/AllInput'
import ChatMessage from './components/ChatMessage'
import { ChatGpt, RequestChatOptions } from '@/types'
import { postChatCompletions, postImagesGenerations, postUploadImage } from '@/request/api'
import Reminder from '@/components/Reminder'
import { filterObjectNull, formatTime, generateUUID, handleChatData } from '@/utils'
import { useScroll } from '@/hooks/useScroll'
import useDocumentResize from '@/hooks/useDocumentResize'
import Layout from '@/components/Layout'
import { getMysqlChats } from '@/store/user/async'
import LoadingModal from '@/components/LoadingModal'

function ChatPage() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { scrollToBottomIfAtBottom, scrollToBottom } = useScroll(scrollRef.current)
  const { token, setLoginModal } = userStore()
  const { config, models, changeConfig, setConfigModal } = configStore()

  useEffect(() => {
    if (models.length > 0 && (!config.model || !models.some(m => m.value === config.model))) {
      changeConfig({
        ...config,
        model: models[0].value
      });
    }
  }, [models, config, changeConfig]);

  const {
    chats,
    addChat,
    delChat,
    clearChats,
    selectChatId,
    changeSelectChatId,
    setChatInfo,
    setChatDataInfo,
    clearChatMessage,
    delChatMessage,
    updateChats
  } = chatStore()

  // 角色预设
  const [roleConfigModal, setRoleConfigModal] = useState({
    open: false
  })
  const [loading, setLoading] = useState(false);


  const [selectedQuickPrompt, setSelectedQuickPrompt] = useState('');
  // 在状态中添加一个用于存储上传文件的变量
  const [uploadedFile, setUploadedFile] = useState(null);
  // 添加一个状态来保存图片的 URL
  const [imageURL, setImageURL] = useState('');
  const [fileList, setFileList] = useState<UploadFile<any>[]>([]);

  const uploadImage = async (file: File) => {
    try {
      // 直接传递 file 参数
      const response = await postUploadImage(file);

      // 在控制台中打印响应结果
      console.log('上传响应:', response);

      if (response.code === 0 && response.data && response.data.url) {
        setImageURL(response.data.url); // 使用 response.data.url 访问 URL
        setFileList([{
          uid: '-1', // 文件唯一标识
          name: file.name, // 文件名
          status: 'done', // 状态有：uploading, done, error, removed
          url: response.data.url // 下载链接
        }]);
        message.success('图片上传成功');
      } else {
        message.error('图片上传失败');
      }
    } catch (error) {
      console.error('上传失败:', error);
      message.error('图片上传异常');
    }
  };

  const beforeUpload = (file: File) => {
    uploadImage(file); // 上传图片
    return false; // 阻止组件自动上传文件
  };

  const quickPrompts = ['', '唯美二次元', '中国风', '艺术创想', '插画', '炫彩插画', '水墨画', '超现实主义', '印象派', '像素艺术', '海报', '写实风景', '卡通', '扁平风'];

  const handleQuickPromptChange = (e: RadioChangeEvent) => {
    setSelectedQuickPrompt(e.target.value);
  };

  const imageUploadSelector = config.model === 'gpt-4-vision-preview' ? (
    <div className={styles.drawPage_config}>
      <Space direction="vertical">
        <Upload
          beforeUpload={beforeUpload}
          listType="picture"
          maxCount={1}
          fileList={fileList}
          onChange={({ fileList: newFileList }) => setFileList(newFileList)}
        >
          <Button icon={<UploadOutlined />}>选择图片</Button>
        </Upload>
      </Space>
    </div>
  ) : null;


  // 图片大小选择器
  const imageSizeSelector = (
    <div className={styles.drawPage_config}>
      <Space direction="vertical">
        <p>比例({config.size})</p>
        <Radio.Group
          //buttonStyle="solid"
          defaultValue={config.size || '1024x1024'}
          value={config.size}
          onChange={(e) => {
            changeConfig({ ...config, size: e.target.value });
          }}
        >
          <Radio.Button value={'1024x1024'}>方形</Radio.Button>
          <Radio.Button value={'1792x1024'}>横向</Radio.Button>
          <Radio.Button value={'1024x1792'}>竖向</Radio.Button>
        </Radio.Group>
        <p>图片类型</p>
        <div className={styles.drawPage_quickPrompts}>
          <Radio.Group onChange={handleQuickPromptChange} value={selectedQuickPrompt}>
            {quickPrompts.map(prompt => (
              <Radio key={prompt} value={prompt} className={styles.radio}>
                {prompt === '' ? '默认' : prompt}
              </Radio>
            ))}
          </Radio.Group>
        </div>
      </Space>
    </div>
  );

  useLayoutEffect(() => {
    if (scrollRef) {
      scrollToBottom()
    }
  }, [scrollRef.current, selectChatId, chats])


  // 当前聊天记录
  const chatMessages = useMemo(() => {
    const chatList = chats.filter((c) => c.id === selectChatId)
    if (chatList.length <= 0) {
      return []
    }
    return chatList[0].data
  }, [selectChatId, chats])


  const handleMenuClick = (r: { key: string }) => {
    const id = r.key.replace('/', '');
    setLoading(true); // 设置 loading 为 true
    getMysqlChats(id)
      .then((mysqlChats) => {
        updateChats(mysqlChats);
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        setLoading(false); // 设置 loading 为 false
      });
    if (selectChatId !== id) {
      changeSelectChatId(id);
    }
  };


  // 创建对话按钮
  const CreateChat = () => {
    return (
      <Button
        block
        type="dashed"
        style={{
          marginBottom: 6,
          marginLeft: 0,
          marginRight: 0
        }}
        onClick={() => {
          // if (!token) {
          //   setLoginOptions({
          //     open: true
          //   })
          //   return
          // }
          addChat()
        }}
      >
        新建对话
      </Button>
    )
  }

  // 警告：不推荐在实际应用中使用这种方法，因为它会阻塞主线程
  async function delayMicroseconds(us: number) {
    const start = performance.now();
    while ((performance.now() - start) < (us / 1000)) {
      // 忙等
    }
  }


  // 对接服务端方法
  async function serverChatCompletions({
    requestOptions,
    signal,
    userMessageId,
    assistantMessageId,
  }: {
    userMessageId: string
    signal: AbortSignal
    requestOptions: RequestChatOptions
    assistantMessageId: string
  }) {
    const newRequestOptions = {
      ...requestOptions,
      userMessageId: userMessageId,
      assistantMessageId: assistantMessageId,
    };
    const response = await postChatCompletions(newRequestOptions, {
      options: {
        signal
      }
    })
      .then((res) => {
        return res
      })
      .catch((error) => {
        // 终止： AbortError
        console.log(error.name)
      })

    if (response) {
      // 消息发送成功，更新聊天记录等操作

      // 在这里重置 imageURL
      setImageURL('');
      setFileList([]);    // 清除上传文件列表
    }

    if (!(response instanceof Response)) {
      // 这里返回是错误 ...
      console.log('这里是：', userMessageId)
      if (userMessageId) {
        setChatDataInfo(selectChatId, userMessageId, {
          status: 'error'
        })
      }

      setChatDataInfo(selectChatId, assistantMessageId, {
        status: 'error',
        text: response?.message || '❌ 请求异常，请稍后在尝试。'
      })
      fetchController?.abort()
      setFetchController(null)
      message.error('请求失败')
      return
    }
    const reader = response.body?.getReader?.()
    // let allContent = ''
    // while (true) {
    //   const { done, value } = (await reader?.read()) || {}
    //   if (done) {
    //     fetchController?.abort()
    //     setFetchController(null)
    //     break
    //   }
    //   // 将获取到的数据片段显示在屏幕上
    //   const text = new TextDecoder('utf-8').decode(value)
    //   const texts = text
    //     .split('\n')
    //     .filter((item) => item !== undefined && item !== null && item.trim() !== '')
    //     .map((d) => {
    //       return JSON.parse(d)
    //     })
    //   for (let i = 0; i < texts.length; i++) {
    //     const { dateTime, role, content, segment } = texts[i]
    //     // 打印出每一条消息
    //     console.log(dateTime, role, content, segment)
    //     allContent += content ? content : ''
    //     if (segment === 'stop') {
    //       setFetchController(null)
    //       setChatDataInfo(selectChatId, userMessageId, {
    //         status: 'pass'
    //       })
    //       setChatDataInfo(selectChatId, assistantMessageId, {
    //         text: allContent,
    //         dateTime,
    //         status: 'pass'
    //       })
    //       break
    //     }

    //     if (segment === 'start') {
    //       setChatDataInfo(selectChatId, userMessageId, {
    //         status: 'pass'
    //       })
    //       setChatDataInfo(selectChatId, assistantMessageId, {
    //         text: allContent,
    //         dateTime,
    //         status: 'loading',
    //         role,
    //         requestOptions
    //       })
    //     }
    //     if (segment === 'text') {
    //       setChatDataInfo(selectChatId, assistantMessageId, {
    //         text: allContent,
    //         dateTime,
    //         status: 'pass'
    //       })
    //     }
    //   }
    //   scrollToBottomIfAtBottom()
    // }
    
    let partialContent = '';
    let tmpAllContent = '';
    while (true) {
      const { done, value } = (await reader?.read()) || {};
      if (done) {
        fetchController?.abort();
        setFetchController(null);
        break;
      }
      // 将获取到的数据片段显示在屏幕上
      let text = new TextDecoder('utf-8').decode(value, { stream: true });
      partialContent += text;

      // 分割并处理每一条消息
      let messages = partialContent.split('\n\n');
      for (let i = 0; i < messages.length - 1; i++) {
        let messageData = JSON.parse(messages[i]);
        const { dateTime, role, content, segment } = messageData;
        if (segment === 'stop') {
          setFetchController(null);
          setChatDataInfo(selectChatId, userMessageId, {
            status: 'pass'
          });
          setChatDataInfo(selectChatId, assistantMessageId, {
            text: tmpAllContent,
            dateTime,
            status: 'pass'
          });
          break;
        }

        if (segment === 'start') {
          // 逐个字符更新UI
          for (let char of content) {
            tmpAllContent += char;
            // await delayMicroseconds(1);
            // await new Promise(resolve => setTimeout(resolve, 0));
          }
          setChatDataInfo(selectChatId, userMessageId, {
            status: 'pass'
          })
          setChatDataInfo(selectChatId, assistantMessageId, {
            text: tmpAllContent,
            dateTime,
            status: 'loading',
            role
          });
        }

        if (segment === 'text') {
          // 逐个字符更新UI
          for (let char of content) {
            tmpAllContent += char;
            // await delayMicroseconds(1);
            await new Promise(resolve => setTimeout(resolve, 1));
          }
          setChatDataInfo(selectChatId, assistantMessageId, {
            text: tmpAllContent,
            dateTime,
            status: 'pass'
          })
        }
      }
      // 保留未完整接收的部分消息
      partialContent = messages[messages.length - 1];

      scrollToBottomIfAtBottom();
    }
  }

  const [fetchController, setFetchController] = useState<AbortController | null>(null)

  // 对话
  async function sendChatCompletions(vaule: string, refurbishOptions?: ChatGpt) {
    if (!token) {
      setLoginModal(true)
      return
    }
    const selectChatIdStr = selectChatId.toString()
    const parentMessageId =
      refurbishOptions?.requestOptions.parentMessageId ||
      chats.filter((c) => c.id === selectChatId)[0].id
    let userMessageId = generateUUID()
    const requestOptions = {
      prompt: vaule,
      parentMessageId,
      selectChatIdStr,
      imageURL: config.model === 'gpt-4-vision-preview' ? imageURL || undefined : undefined,
      options: filterObjectNull({
        ...config,
        ...refurbishOptions?.requestOptions.options
      })
    }
    const assistantMessageId = refurbishOptions?.id || generateUUID()
    if (refurbishOptions?.requestOptions.parentMessageId && refurbishOptions?.id) {
      userMessageId = ''
      setChatDataInfo(selectChatId, assistantMessageId, {
        status: 'loading',
        role: 'assistant',
        text: '',
        dateTime: formatTime(),
        requestOptions
      })
    } else {
      setChatInfo(selectChatId, {
        id: userMessageId,
        text: vaule,
        dateTime: formatTime(),
        status: 'pass',
        role: 'user',
        requestOptions,
        uploadedImageUrl: config.model === 'gpt-4-vision-preview' ? imageURL || undefined : undefined,
      })
      setChatInfo(selectChatId, {
        id: assistantMessageId,
        text: '',
        dateTime: formatTime(),
        status: 'loading',
        role: 'assistant',
        requestOptions
      })
    }
    
    const controller = new AbortController()
    const signal = controller.signal
    setFetchController(controller)


    if (config.model === 'dall-e-3') {
      const promptValue = selectedQuickPrompt ? `${selectedQuickPrompt} ${vaule}` : vaule;
      const requestOptions = {
        prompt: promptValue,
        parentMessageId,
        size: config.size,
        options: filterObjectNull({
          ...config,
        }),
      };
      const imageOptions = {
        chatDrawFlag: true,
        userMessageId: userMessageId,
        assistantMessageId: assistantMessageId,
        selectChatIdStr: selectChatIdStr
      };
      postImagesGenerations(requestOptions, imageOptions, { timeout: 0 })
        .then(res => {
          if (res.code === 0 && res.data && res.data.length > 0) {
            const imageUrl = res.data[0].url;
            console.log('Setting image URL:', imageUrl);
            setChatDataInfo(selectChatId, userMessageId, { status: 'pass' });
            setChatDataInfo(selectChatId, assistantMessageId, {
              imageUrl,
              dateTime: formatTime(),
              status: 'pass',
              isImage: true,
            });
          } else {
            setChatDataInfo(selectChatId, assistantMessageId, {
              text: '绘画失败或未返回图片',
              dateTime: formatTime(),
              status: 'error',
            });
          }
        })
        .finally(() => {
          setFetchController(null);
        });
    } else {
      serverChatCompletions({
        requestOptions,
        signal,
        userMessageId,
        assistantMessageId,
      })
    }
  }

  return (
    
    <div className={styles.chatPage}>
      <Layout
        menuExtraRender={() => <CreateChat />}
        route={{
          path: '/',
          routes: chats
        }}
        menuDataRender={(item) => {
          return item
        }}
        menuItemRender={(item, dom) => {
          const className =
            item.id === selectChatId
              ? `${styles.menuItem} ${styles.menuItem_action}`
              : styles.menuItem
          return (
            <div className={className}>
              <span className={styles.menuItem_icon}>
                <CommentOutlined />
              </span>
              <span className={styles.menuItem_name}>{item.name}</span>
              <div className={styles.menuItem_options}>
                <Popconfirm
                  title="删除会话"
                  description="是否确定删除会话？"
                  onConfirm={() => {
                    delChat(item.id)
                    handleMenuClick({ key: '/' + chats[0].id})
                  }}
                  onCancel={() => {
                    // ==== 无操作 ====
                  }}
                  okText="是"
                  cancelText="否"
                >
                  <DeleteOutlined />
                </Popconfirm>
              </div>
            </div>
          )
        }}
        menuFooterRender={(props) => {
          //   if (props?.collapsed) return undefined;
          return (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Select
                size="middle"
                style={{ width: '100%' }}
                defaultValue={config.model}
                value={config.model}
                options={models.map((m) => ({ ...m, label: 'AI模型: ' + m.label }))}
                onChange={(e) => {
                  changeConfig({
                    ...config,
                    model: e.toString()
                  })
                }}
                popupMatchSelectWidth
              />
              <Button
                block
                onClick={() => {
                  setRoleConfigModal({ open: true })
                }}
              >
                角色预设
              </Button>
              <Button
                block
                onClick={() => {
                  setConfigModal(true)
                  // chatGptConfigform.setFieldsValue({
                  //   ...config
                  // })
                  // setChatConfigModal({ open: true })
                }}
              >
                系统配置
              </Button>
              <Popconfirm
                title="删除全部对话"
                description="您确定删除全部会话对吗? "
                onConfirm={() => {
                  clearChats()
                }}
                onCancel={() => {
                  // ==== 无操作 ====
                }}
                okText="是"
                cancelText="否"
              >
                <Button block danger type="dashed" ghost>
                  清除所有对话
                </Button>
              </Popconfirm>
            </Space>
          )
        }}
        // menuProps={{
        //   onClick: (r) => {
        //     const id = r.key.replace('/', '')
        //     // 查找mysql中对话rooms
        //     getMysqlChats(id).then(mysqlChats => {
        //       updateChats(mysqlChats);
        //     }).catch(error => {
        //       console.error(error);
        //     });
        //     if (selectChatId !== id) {
        //       changeSelectChatId(id)
        //     }
        //   },
        // }}
        menuProps={{
          onClick: handleMenuClick,
        }}
      >
        <div className={styles.chatPage_container}>
          <div ref={scrollRef} className={styles.chatPage_container_one}>
            <div id="image-wrapper">
              {chatMessages.map((item) => {
                return (
                  <ChatMessage
                    key={item.id}
                    position={item.role === 'user' ? 'right' : 'left'}
                    status={item.status}
                    content={item.text}
                    time={item.dateTime}
                    model={item.requestOptions?.options?.model}
                    isImage={item.isImage}
                    imageUrl={item.imageUrl}
                    uploadedImageUrl={item.uploadedImageUrl}
                    onDelChatMessage={() => {
                      delChatMessage(selectChatId, item.id)
                    }}
                    onRefurbishChatMessage={() => {
                      console.log('rechat', item)
                      sendChatCompletions(item.requestOptions.prompt, item)
                    }}
                  />
                )
              })}
              {(chatMessages.length <= 0 && loading === false) && <Reminder />}
              {loading && <LoadingModal />}
            </div>
          </div>
          <div className={styles.chatPage_container_two}>
            {config.model === 'dall-e-3' && imageSizeSelector}
            {imageUploadSelector}
            <AllInput
              disabled={!!fetchController}
              onSend={(value) => {
                if (value.startsWith('/')) return
                sendChatCompletions(value)
                scrollToBottomIfAtBottom()
              }}
              clearMessage={() => {
                clearChatMessage(selectChatId)
              }}
              onStopFetch={() => {
                // 结束
                setFetchController((c) => {
                  c?.abort()
                  return null
                })
              }}
            />
          </div>
        </div>
      </Layout>

      {/* AI角色预设 */}
      <Modal
        title="AI角色预设"
        open={roleConfigModal.open}
        footer={null}
        destroyOnClose
        onCancel={() => setRoleConfigModal({ open: false })}
        width={800}
        style={{
          top: 50
        }}
      >
        <RoleLocal />
      </Modal>
    </div>
  )
}
export default ChatPage
