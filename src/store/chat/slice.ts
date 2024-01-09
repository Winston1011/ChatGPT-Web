import {create} from 'zustand'
import {createJSONStorage, persist} from 'zustand/middleware'
import {ChatGpt, ChatsInfo} from '@/types'
import {formatTime, generateChatInfo} from '@/utils'
import {
    postRoomCreate,
    postRoomUpdateStatus,
    postRoomUpdateTitle,
    postMessageUpdateStatus,
    postDelMessage
} from '@/request/api'
import {getMysqlChats} from '../user/async'


export interface ChatState {
    // 聊天对话
    chats: Array<ChatsInfo>
    // 当前选择的会话id
    selectChatId: string | number
    // 新增一个对话
    addChat: () => void
    // 删除一个对话
    delChat: (id: string | number) => void
    // 清空所有对话
    clearChats: () => void
    // 改变选择会话ID
    changeSelectChatId: (id: string | number) => void
    // 给对话添加数据
    setChatInfo: (
        id: string | number,
        data?: ChatGpt,
        info?: ChatsInfo | { [key: string]: any }
    ) => void
    // 修改对话数据
    setChatDataInfo: (
        id: string | number,
        messageId: string | number,
        info?: ChatGpt | { [key: string]: any }
    ) => void
    // 清理当前会话
    clearChatMessage: (id: string | number) => void
    // 删除某条消息
    delChatMessage: (id: string | number, messageId: string | number) => void

    // 更新chats
    updateChats: (mysqlChats: any) => void
}

const chatStore = create<ChatState>()(
    persist(
        (set) => ({
            chats: [],
            selectChatId: '',
            addChat: () =>
                set((state: ChatState) => {
                    const info = generateChatInfo()
                    // 新增room
                    postRoomCreate({title: 'New Chat', roomId: info.id})
                        .then((res) => {
                            if (res.code) return
                        })
                    const newChats = [...state.chats]
                    newChats.unshift({...info})
                    return {
                        chats: [...newChats],
                        selectChatId: info.id
                    }
                }),
            delChat: (id) =>
                set((state: ChatState) => {
                    const newChats = state.chats.filter((c) => c.id !== id)
                    state.chats.filter((c) => c.id === id)
                    // 更新room库status为1
                    postRoomUpdateStatus({roomId: id.toString()})
                    const newId = newChats[0].id
                    // 查找mysql中对话rooms
                    getMysqlChats(newId.toString()).then(mysqlChats => {
                        state.chats = mysqlChats;
                    })
                    return {
                        selectChatId: state.chats[0].id,
                        chats: newChats
                    }
                }),
            clearChats: () =>
                set((state: ChatState) => {
                    // 更新所有room对话status=1
                    state.chats.map((c) => {
                        // 更新room库status为1
                        postRoomUpdateStatus({roomId: c.id.toString()})
                            .then((res) => {
                                if (res.code) return
                            })
                        // 更新message表所有roomId下的status = 1
                        postMessageUpdateStatus({roomId: c.id.toString()})
                            .then((res) => {
                                if (res.code) return
                            })
                    })
                    const info = generateChatInfo()
                    return {
                        chats: [{...info}],
                        selectChatId: info.id
                    }
                }),
            changeSelectChatId: (id) =>
                set((state: ChatState) => {
                    // 查找mysql中对话rooms
                    getMysqlChats(id.toString()).then(mysqlChats => {
                        state.chats = mysqlChats;
                    })
                    return {
                        // chats: newChats,
                        selectChatId: id
                    }
                }),
            delChatMessage: (id, messageId) =>
                set((state: ChatState) => {
                    const newChats = state.chats.map((c) => {
                        if (c.id === id) {
                            // mysql删除消息
                            postDelMessage({messageId: messageId.toString()})
                            const newData = c.data.filter((d) => d.id !== messageId)
                            return {
                                ...c,
                                data: newData
                            }
                        }
                        return c
                    })
                    return {
                        chats: newChats
                    }
                }),
            clearChatMessage: (id) =>
                set((state: ChatState) => {
                    const newChats = state.chats.map((c) => {
                        if (c.id === id) {

                            // 更新message表
                            postMessageUpdateStatus({roomId: c.id.toString()})
                                .then((res) => {
                                    if (res.code) return
                                })


                            return {
                                ...c,
                                parentMessageId: '',
                                data: [],
                                text: '',
                                dateTime: formatTime()
                            }
                        }
                        return c
                    })
                    return {
                        chats: newChats
                    }
                }),
            setChatInfo: (id, data, info) =>
                set((state: ChatState) => {
                    let roomUpdateFlag = false;
                    if (data?.role == 'user') {
                        roomUpdateFlag = true;
                    }
                    const newChats = state.chats.map((item) => {
                        if (item.id === id) {
                            const name = item.data.length <= 0 && data?.text ? data.text : item.name
                            const truncatedName = name.length > 50 ? name.substring(0, 50) : name;
                            // 更新room表title为当前name
                            if (roomUpdateFlag) {
                                postRoomUpdateTitle({ title: truncatedName ?? 'New Chat', roomId: id.toString() })
                                    .then((res) => {
                                        if (res.code) return
                                    })
                            }
                            return {
                                ...item,
                                name,
                                ...info,
                                data: data ? item.data.concat({...data}) : item.data
                            }
                        }
                        return item
                    })
                    return {
                        chats: newChats
                    }
                }),
            setChatDataInfo: (id, messageId, info) =>
                set((state: ChatState) => {
                    const newChats = state.chats.map((item) => {
                        if (item.id === id) {
                            const newData = item.data.map((m) => {
                                if (m.id === messageId) {
                                    return {
                                        ...m,
                                        ...info
                                    }
                                }
                                return m
                            })
                            const dataFilter = newData.filter((d) => d.id === messageId)
                            const chatData = {id: messageId, ...info} as ChatGpt
                            return {
                                ...item,
                                data: dataFilter.length <= 0 ? [...newData, {...chatData}] : [...newData]
                            }
                        }
                        return item
                    })

                    return {
                        chats: newChats
                    }
                }),
            // ...其他方法...
            updateChats: (mysqlChats: any) => {
                set((state: ChatState) => ({
                    ...state,
                    chats: mysqlChats
                }));
            }
        }),
        {
            name: 'chat_storage', // name of item in the storage (must be unique)
            storage: createJSONStorage(() => localStorage) // (optional) by default the 'localStorage' is used
        }
    )
)

export default chatStore
