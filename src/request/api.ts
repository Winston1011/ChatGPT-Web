import {
  ProductInfo,
  RequesPrepay,
  RequestChatOptions,
  RequestImagesGenerations,
  RequestLoginParams,
  ResponseConfigData,
  ResponseLoginData,
  SigninInfo,
  SubscriptionInfo,
  TurnoverInfo,
  RoomInfo,
  MessageInfo,
  UserInfo,
} from '@/types'
import request from '.'
import { formatTime } from '@/utils'
import { TableData } from '@/types/admin'

// 获取验证码
export function getCode(params: { source: string }) {
  return request.get('/api/send_sms', params)
}

// 登陆
export function postLogin(params: RequestLoginParams) {
  return request.post<ResponseLoginData>('/api/login', params)
}

// 获取用户信息
export function getUserInfo() {
  return request.get<UserInfo>('/api/user/info')
}

// 请求对话
export function postChatCompletions(
  params: RequestChatOptions,
  config?: {
    headers?: { [key: string]: any }
    options?: { [key: string]: any }
  }
) {
  return request.postStreams<Response>('/api/chat/completions', params, config)
}

//请求创建room
export function postRoomCreate(params: { title: string, roomId: string }){
  return request.post('/api/roomcreate', params)
}

//请求更新room status
export function postRoomUpdateStatus(params: {  roomId: string }){
  return request.post('/api/roomupdatestatus', params)
}

//请求更新room title
export function postRoomUpdateTitle(params: {  title: string, roomId: string }){
  return request.post('/api/roomupdatetitle', params)
}

//请求更新message status
export function postMessageUpdateStatus(params: { roomId: string }){
  return request.post('/api/messageupdatestatus', params)
}

//请求删除message
export function postDelMessage(params: { messageId: string }){
  return request.post('/api/delmessage', params)
}

//获取user_id 所有room
export function getRooms(){
  return request.get<{ count: number; rows: Array<RoomInfo> }>('/api/getrooms')
}

//获取user_id room_id下所有历史记录
export function chatHistory(params: { roomId: string }){
  return request.get<{ count: number; rows: Array<MessageInfo> }>('/api/chathistory', params)
}


// 请求绘画
export function postImagesGenerations(
  params: RequestImagesGenerations,
  headers?: { [key: string]: any },
  options?: { [key: string]: any }
) {
  return request.post<Array<{ url: string }>>(
    '/api/images/generations',
    { ...params },
    headers,
    options
  )
}

// 获取商品列表
export function getProduct() {
  return request.get< {
	products: Array<ProductInfo>,
	pay_types: Array<string>
  }>('/api/product')
}

// 获取用户消费记录
export function getUserTurnover(params: { page: number; page_size: number }) {
  return request.get<{ count: number; rows: Array<TurnoverInfo> }>('/api/turnover', params)
}

// 提交订单
export function postPayPrecreate(params: RequesPrepay) {
  return request.post<{
    order_id: string
    pay_url: string
    pay_key: string
    qrcode?: string
  }>('/api/pay/precreate', params)
}

// 卡密充值
export function postUseCarmi(params: { carmi: string }) {
  return request.post('/api/use_carmi', params)
}

// 签到
export function postSignin() {
  return request.post('/api/signin')
}

// 获取签到列表
export function getSigninList() {
  return request.get<Array<SigninInfo>>('/api/signin/list')
}

// 重置用户密码
export function putUserPassword(params: RequestLoginParams) {
  return request.put('/api/user/password', params)
}

// 获取配置数据
export function getConfig() {
	return request.get<ResponseConfigData>('/api/config')
  }

export function postUploadImage(
  file: File, // 直接接收 File 类型的参数
  options?: { [key: string]: any }
) {
  const reader = new FileReader();
  return new Promise<{ url: string }>((resolve, reject) => {
    reader.onloadend = async () => {
      try {
        const response = await request.post<{ url: string }>('/api/upload/image', {
          file: reader.result,
        }, options);
        resolve(response);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}