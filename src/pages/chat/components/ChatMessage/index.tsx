import React, { useEffect, useMemo, useRef } from 'react'
import { copyToClipboard, joinTrim } from '@/utils'
import styles from './index.module.less'
import OpenAiLogo from '@/components/OpenAiLogo'
import { Space, Popconfirm, Image, message, Dropdown } from 'antd'

import MarkdownIt from 'markdown-it'
import mdKatex from '@traptitech/markdown-it-katex'
import mila from 'markdown-it-link-attributes'
import hljs from 'highlight.js'
import { CopyOutlined, DeleteOutlined, LoadingOutlined, MoreOutlined, RedoOutlined } from '@ant-design/icons'
import { isUrl } from '@ant-design/pro-components'

const dropdownItems = [
  {
    icon: <CopyOutlined />,
    label: '复制',
    key: 'copyout',
  },
  {
    icon: <RedoOutlined />,
    label: '重试',
    key: 'refurbish',
  },
  {
    icon: <DeleteOutlined />,
    label: '删除',
    key: 'delete',
  },
]

function screenDropdownItems(status: string, position: 'left' | 'right') {
  const newList = dropdownItems.filter((item) => {
    // if (status !== 'error' && item.key === 'delete') {
    //   return false
    // }

    if (position !== 'left' && item.key === 'refurbish') {
      return false
    }
    return true;
  });

  return [...newList]
}

function ChatMessage({
  position,
  content,
  status,
  time,
  model,
  isImage,
  imageUrl,
  uploadedImageUrl,
  onDelChatMessage,
  onRefurbishChatMessage
}: {
  position: 'left' | 'right'
  content?: string
  status: 'pass' | 'loading' | 'error' | string
  time: string
  model?: string
  isImage?: boolean,
  imageUrl?: string,
  uploadedImageUrl?: string,
  onDelChatMessage?: () => void
  onRefurbishChatMessage?: () => void
}) {
  const copyMessageKey = 'copyMessageKey'
  const markdownBodyRef = useRef<HTMLDivElement>(null)

  const mdi = new MarkdownIt({
    html: true,
    linkify: true,
    highlight(code, language) {
      const validLang = !!(language && hljs.getLanguage(language));
      if (validLang) {
        const lang = language ?? '';
        return highlightBlock(hljs.highlight(code, { language: lang }).value, lang, code);
      }
      return highlightBlock(hljs.highlightAuto(code).value, '', code);
    }
  });

  mdi.use(mila, { attrs: { target: '_blank', rel: 'noopener' } })
  mdi.use(mdKatex, { blockClass: 'katex-block', errorColor: ' #cc0000', output: 'mathml' })


  useEffect(() => {
    addCopyEvents();
    return () => {
      removeCopyEvents();
    };
  }, [markdownBodyRef.current]);

  function highlightBlock(str: string, lang: string, code: string) {
    return `<pre class="code-block-wrapper"><div class="code-block-header"><span class="code-block-header__lang">${lang}</span><span class="code-block-header__copy">复制代码</span></div><code class="hljs code-block-body ${lang}">${str}</code></pre>`
  }

  function onCopyOut(text: string) {
    copyToClipboard(text)
      .then(() => {
        message.open({
          key: copyMessageKey,
          type: 'success',
          content: '复制成功'
        })
      })
      .catch(() => {
        message.open({
          key: copyMessageKey,
          type: 'error',
          content: '复制失败'
        })
      })
  }

  function addCopyEvents() {
    if (markdownBodyRef.current) {
      const copyBtn = markdownBodyRef.current.querySelectorAll('.code-block-header__copy');
      copyBtn.forEach((btn) => {
        btn.addEventListener('click', () => {
          const code = btn.parentElement?.nextElementSibling?.textContent;
          if (code) {
            copyToClipboard(code)
              .then(() => {
                message.open({
                  key: copyMessageKey,
                  type: 'success',
                  content: '复制成功'
                });
              })
              .catch(() => {
                message.open({
                  key: copyMessageKey,
                  type: 'error',
                  content: '复制失败'
                });
              });
          }
        });
      });
    }
  }

  function removeCopyEvents() {
    if (markdownBodyRef.current) {
      const copyBtn = markdownBodyRef.current.querySelectorAll('.code-block-header__copy')
      copyBtn.forEach((btn) => {
        btn.removeEventListener('click', () => {
          // ==== 无需操作 ====
        })
      })
    }
  }

  function renderLoadingText() {
    if (model === 'dall-e-3') {
      return '绘制中，请稍候...';
    }
    return 'AI 思考中...';
  }

  function renderContent() {
    console.log('Rendering content, isImage:', isImage, 'imageUrl:', imageUrl);

    // 如果有 AI 生成的图片，则直接返回该图片
    if (isImage && imageUrl) {
      return <Image src={imageUrl} alt="Generated Content" style={{ maxHeight: '40vh' }} />;
    }

    // 如果有上传的图片 URL，则准备图片元素
    const imageElement = uploadedImageUrl ? <Image src={uploadedImageUrl} alt="Uploaded Content" style={{ maxHeight: '40vh' }} /> : null;

    // 判断content是否为URL链接
    const isContentUrl = isUrl(content)
    if (isContentUrl) {
      return <Image src={content} alt="Generated Content" style={{ maxHeight: '40vh' }} />;
    }

    // 判断content是否问文本+URL
    const splitStr = content.split("<=>") ?? '';
    const contentStr = splitStr[0] ?? '';
    const imgUrl = splitStr[1] ?? '';
    if (contentStr.length > 0 && imgUrl.length > 0) {
      // 如果有图片 URL，则准备图片元素
      const imgElement = imgUrl ? <Image src={imgUrl} alt="Ask Image Content" style={{ maxHeight: '40vh' }} /> : null;
      // 如果有文本内容，则准备文本元素
      const contentStrElement = contentStr ? <div ref={markdownBodyRef} className={'markdown-body'} dangerouslySetInnerHTML={{ __html: mdi.render(contentStr) }} /> : null;
      // 返回图片和文本的组合
      return (
        <>
          {contentStrElement}
          {imgElement}
        </>
      );
    }

    // 如果有文本内容，则准备文本元素
    const textElement = content ? <div ref={markdownBodyRef} className={'markdown-body'} dangerouslySetInnerHTML={{ __html: mdi.render(content) }} /> : null;

    // 返回图片和文本的组合
    return (
      <>
        {imageElement}
        {textElement}
      </>
    );
  }

  const renderText = useMemo(() => {
    const value = content || ''
    if (position === 'right') {
      return (
        <div
          ref={markdownBodyRef}
          className="markdown-body"
        >
          {value}
        </div>
      );
    }
    const renderMdHtml = mdi.render(value);
    return (
      <div
        ref={markdownBodyRef}
        className="markdown-body"
        dangerouslySetInnerHTML={{
          __html: renderMdHtml
        }}
      />
    )
  }, [content, position])

  function chatAvatar({ icon, style }: { icon: string; style?: React.CSSProperties }) {
    return (
      <Space direction="vertical" style={{ textAlign: 'center', ...style }}>
        <img className={styles.chatMessage_avatar} src={icon} alt="" />
        {status === 'error' && (
          <Popconfirm
            title="删除此条消息"
            description="此条消息为发送失败消息，是否要删除?"
            onConfirm={() => {
              onDelChatMessage?.()
            }}
            onCancel={() => {
              // === 无操作 ===
            }}
            okText="是"
            cancelText="否"
          >
            <DeleteOutlined style={{ color: 'red' }} />
          </Popconfirm>
        )}
      </Space>
    )
  }

  return (
    <div
      className={styles.chatMessage}
      style={{
        justifyContent: position === 'right' ? 'flex-end' : 'flex-start'
      }}
    >
      {/* https://u1.dl0.cn/icon/chat_gpt_3.png */}
      {/* https://u1.dl0.cn/icon/chat_gpt_4.png */}
      {/* https://u1.dl0.cn/icon/openailogo.svg */}
      {position === 'left' &&
        chatAvatar({
          style: { marginRight: 8 },
          icon: model && model.indexOf('gpt-4') !== -1 ? 'https://minioapi.nonezero.top/dz-minio-os/gpt-4-icon.png' : 'https://minioapi.nonezero.top/dz-minio-os/gpt-3.5-icon.png'
        })}
      <div className={styles.chatMessage_content}>
        <span
          className={styles.chatMessage_content_time}
          style={{
            textAlign: position === 'right' ? 'right' : 'left'
          }}
        >
          {time}
        </span>
        <div
          className={joinTrim([
            styles.chatMessage_content_text,
            position === 'right' ? styles.right : styles.left
          ])}
        >
          {status === 'loading' ? (
            // <OpenAiLogo rotate />
            <div>
              <div>
                <LoadingOutlined />
                <span> {renderLoadingText()}</span>
              </div>
            </div>
          ) : (
            renderContent()
            // renderText
          )}
          <div className={styles.chatMessage_content_operate}
            style={{
              left: position === 'right' ? -20 : 'none',
              right: position === 'left' ? -20 : 'none',
            }}
          >
            <Dropdown
              placement="topRight"
              arrow={{
                pointAtCenter: true,
              }}
              destroyPopupOnHide
              trigger={['click', 'hover']}
              menu={{
                items: [...screenDropdownItems(status, position)],
                onClick: ({ key }) => {
                  console.log(key)
                  if (key === 'delete') {
                    onDelChatMessage?.()
                  }

                  if (key === 'refurbish') {
                    onRefurbishChatMessage?.()
                  }

                  if (key === 'copyout' && content) {
                    onCopyOut(content);
                  }
                },
              }}
            >
              <div className={styles.chatMessage_content_operate_icon}>
                <MoreOutlined />
              </div>
            </Dropdown>
          </div>
        </div>
      </div>
      {position === 'right' &&
        chatAvatar({
          style: { marginLeft: 8 },
          icon: 'https://minioapi.nonezero.top/dz-minio-os/user-icon-1.png'
        })}
    </div>
  )
}

export default ChatMessage
