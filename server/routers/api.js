/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const tslib_1 = require('tslib');
const express_1 = tslib_1.__importDefault(require('express'));
const redis_1 = tslib_1.__importDefault(require('../helpers/redis'));
const models_1 = require('../models');
const mailer_1 = tslib_1.__importDefault(require('../helpers/mailer'));
const gpt_tokens_1 = require('gpt-tokens');
const utils_1 = require('../utils');
const utils_2 = require('../utils');
const stream_1 = require('stream');
const node_fetch_1 = tslib_1.__importDefault(require('node-fetch'));
const queue_1 = require('../helpers/queue');
const alipay_1 = tslib_1.__importDefault(require('../helpers/alipay'));
const yipay_1 = tslib_1.__importDefault(require('../helpers/yipay'));
const router = express_1.default.Router();

const COS = require('cos-nodejs-sdk-v5');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/config', async (req, res, next) => {
    const shop_introduce = (await models_1.configModel.getKeyConfig('shop_introduce')).value;
    const user_introduce = (await models_1.configModel.getKeyConfig('user_introduce')).value;
    const invite_introduce = (await models_1.configModel.getKeyConfig('invite_introduce')).value;
    const notification = await models_1.notificationModel.getNotification({ page: 0, page_size: 1000 }, { status: 1 });
    const notifications = notification.rows.sort((a, b) => {
        return a.sort - b.sort;
    });
    res.json((0, utils_1.httpBody)(0, {
        shop_introduce,
        user_introduce,
        invite_introduce,
        notifications: notifications
    }));
});
// 发送验证码
router.get('/send_sms', async (req, res) => {
    const source = Array.isArray(req.query.source)
        ? String(req.query.source[0])
        : String(req.query.source);
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    const phoneRegex = /^1[3456789]\d{9}$/;
    if (!emailRegex.test(source) && !phoneRegex.test(source)) {
        res.json((0, utils_1.httpBody)(-1, '请输入正确邮箱或手机号'));
        return;
    }

    // 使用 `generateCode` 函数异步生成一个代码，然后将结果存储在 `code` 变量中
    const code = await (0, utils_1.generateCode)();

    // 连接到 Redis，并选择数据库 0
    // 使用 `setex` 命令将生成的代码 `code` 存储在键 `code:${source}` 中，键名中的 `${source}` 是一个变量
    // 并设置该键的过期时间为 600 秒
    await redis_1.default.select(0).setex(`code:${source}`, code, 600);


    if (emailRegex.test(source)) {
        const mailContent = `
        <div style="font-family: Helvetica, Arial, sans-serif; max-width: 500px; margin: auto; padding: 40px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);">
            <h2 style="text-align: center; color: #111; font-weight: 400;">验证您的邮箱</h2>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;">
            <div style="text-align: center; margin-bottom: 30px;">
                <span style="display: inline-block; font-size: 42px; font-weight: 700; padding: 10px 20px; background-color: #f5f5f5; border-radius: 10px;">${code}</span>
            </div>
            <p style="font-size: 16px; color: #111; text-align: center; line-height: 1.5;">此验证码将在 10 分钟后失效，非本人操作请忽略。</p>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;">
            <p style="font-size: 14px; color: #999; text-align: center;">点击访问：<a href="https://chat.nonezero.top" style="color: #007AFF; text-decoration: none;">AI 助手</a></p>
        </div>
`;
        if (emailRegex.test(source)) {
            await mailer_1.default.send(source, mailContent, `验证码：${code}`, 'code');
        }

    }



    res.json((0, utils_1.httpBody)(0, '发送成功'));
});
// 登陆注册
router.post('/login', async (req, res) => {
    const { account, code, password } = req.body;
    let { invite_code } = req.body
    if(invite_code === ''){
        invite_code = 'winstondz'
    }
    const ip = (0, utils_1.getClientIP)(req);
    if (!account || (!code && !password)) {
        res.status(406).json((0, utils_1.httpBody)(-1, '缺少必要参数'));
        return;
    }
    let userInfo = await models_1.userModel.getUserInfo({ account });
    let md5Password = '';
    // 密码+验证码注册&登录
    if(account && code && password){
        const redisCode = await redis_1.default.select(0).get(`code:${account}`);
        md5Password = (0, utils_1.generateMd5)(password);
        if (!redisCode) {
            res.status(406).json((0, utils_1.httpBody)(-1, '请先发送验证码'));
            return;
        }
        if (code !== redisCode) {
            res.status(406).json((0, utils_1.httpBody)(-1, '验证码不正确'));
            return;
        }
        await redis_1.default.select(0).del(`code:${account}`);
    }
    else if (account && code) {
        const redisCode = await redis_1.default.select(0).get(`code:${account}`);
        if (!redisCode) {
            res.status(406).json((0, utils_1.httpBody)(-1, '请先发送验证码'));
            return;
        }
        if (code !== redisCode) {
            res.status(406).json((0, utils_1.httpBody)(-1, '验证码不正确'));
            return;
        }
        await redis_1.default.select(0).del(`code:${account}`);
    }
    else if (account && password) {
        md5Password = (0, utils_1.generateMd5)(password);
        if (!userInfo) {
            res.status(406).json((0, utils_1.httpBody)(-1, '用户不存在'));
            return;
        }
        if (userInfo.password !== md5Password) {
            res.status(406).json((0, utils_1.httpBody)(-1, '密码不正确'));
            return;
        }
    }
    let isSignin = 1;
    if (!userInfo) {
        isSignin = 0;
        // 新增
        try {
            const id = (0, utils_1.generateNowflakeId)(1)();
            const today = new Date();
            const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            const register_reward = (await models_1.configModel.getKeyConfig('register_reward')).value || 0;
            userInfo = await models_1.userModel
                .addUserInfo((0, utils_1.filterObjectNull)({
                    id,
                    account,
                    ip,
                    invite_code,
                    nickname: '',
                    avatar: 'https://image.lightai.io/icon/header.png',
                    status: 1,
                    role: 'user',
                    password: md5Password ?? (0, utils_1.generateMd5)((0, utils_1.generateMd5)((0, utils_1.generateUUID)() + Date.now().toString())),
                    integral: Number(register_reward),
                    vip_expire_time: (0, utils_2.formatTime)('yyyy-MM-dd', yesterday),
                    svip_expire_time: (0, utils_2.formatTime)('yyyy-MM-dd', yesterday)
                }))
                .then((addRes) => {
                    const turnoverId = (0, utils_1.generateNowflakeId)(1)();
                    models_1.turnoverModel.addTurnover({
                        id: turnoverId,
                        user_id: id,
                        describe: '注册奖励',
                        value: `${register_reward}积分`
                    });
                    return addRes;
                });
        }
        catch (error) {
            res.status(500).json((0, utils_1.httpBody)(-1, '服务器错误'));
            return;
        }
    }
    else {
        models_1.actionModel.addAction({
            id: (0, utils_1.generateNowflakeId)(23)(),
            user_id: userInfo.id,
            ip,
            type: 'login',
            describe: '登录页面'
        });
    }
    const token = await (0, utils_1.generateToken)(userInfo);
    await redis_1.default.select(1).setex(`token:${token}`, JSON.stringify(userInfo), 86400 * 7);
    if (isSignin === 1) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startTime = (0, utils_2.formatTime)('yyyy-MM-dd HH:mm:ss', today);
        isSignin = await models_1.signinModel.getUserDaySignin(userInfo.id, startTime);
    }
    res.json((0, utils_1.httpBody)(0, {
        user_info: {
            ...userInfo,
            is_signin: isSignin ? 1 : 0
        },
        token
    }, '登陆成功'));
});
// 获取用户信息
router.get('/user/info', async (req, res) => {
    const user_id = req?.user_id;
    if (!user_id) {
        res.status(500).json((0, utils_1.httpBody)(-1, '服务端错误'));
        return;
    }
    const userInfo = await models_1.userModel.getUserInfo({ id: user_id });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startTime = (0, utils_2.formatTime)('yyyy-MM-dd HH:mm:ss', today);
    const isSignin = await models_1.signinModel.getUserDaySignin(userInfo.id, startTime);
    res.status(200).json((0, utils_1.httpBody)(0, {
        ...userInfo,
        is_signin: isSignin ? 1 : 0
    }));
});
// 修改用户密码
router.put('/user/password', async (req, res) => {
    const { account, code, password } = req.body;
    if (!account || !code || !password) {
        res.status(406).json((0, utils_1.httpBody)(-1, '缺少必要参数'));
        return;
    }
    const user_id = req?.user_id;
    if (!user_id) {
        res.status(500).json((0, utils_1.httpBody)(-1, '服务端错误'));
        return;
    }
    const redisCode = await redis_1.default.select(0).get(`code:${account}`);
    if (code !== redisCode) {
        res.status(406).json((0, utils_1.httpBody)(-1, '验证码不正确'));
        return;
    }
    await redis_1.default.select(0).del(`code:${account}`);
    const ip = (0, utils_1.getClientIP)(req);
    await models_1.userModel.editUserInfo(user_id, {
        password: (0, utils_1.generateMd5)(password),
        ip
    });
    models_1.actionModel.addAction({
        user_id,
        id: (0, utils_1.generateNowflakeId)(23)(),
        ip,
        type: 'reset_password',
        describe: '重置密码密码'
    });
    res.status(200).json((0, utils_1.httpBody)(0, '重置密码成功'));
});
// 获取用户签到日历
router.get('/signin/list', async (req, res) => {
    const user_id = req?.user_id;
    if (!user_id) {
        res.status(500).json((0, utils_1.httpBody)(-1, '服务端错误'));
        return;
    }
    const date = new Date();
    const start_time = (0, utils_2.formatTime)('yyyy-MM-dd HH:mm:ss', new Date(date.getFullYear(), date.getMonth(), 1));
    const end_time = (0, utils_2.formatTime)('yyyy-MM-dd HH:mm:ss', new Date(date.getFullYear(), date.getMonth() + 1, 1));
    const list = await models_1.signinModel.getUserSigninList(user_id, {
        start_time,
        end_time
    });
    res.status(200).json((0, utils_1.httpBody)(0, list));
});
// 绘画
router.post('/images/generations', async (req, res) => {
    const user_id = req?.user_id;
    if (!user_id) {
        res.status(500).json((0, utils_1.httpBody)(-1, '服务端错误'));
        return;
    }
    const { prompt, n = 1, size = '1024x1024', response_format = 'url' } = req.body;
    const userInfo = await models_1.userModel.getUserInfo({
        id: user_id
    });
    // 检查用户积分
    if (userInfo.integral < 10) {
        res.status(400).json((0, utils_1.httpBody)(-1, [], '积分不足，请在个人中心签到获取积分或开通会员后继续使用'));
        return;
    }
    const ip = (0, utils_1.getClientIP)(req);
    let deductIntegral = 0;
    const drawUsePrice = (await models_1.configModel.getKeyConfig('draw_use_price')).value;
    if (drawUsePrice) {
        const drawUsePriceJson = JSON.parse(drawUsePrice.toString());
        for (const item of drawUsePriceJson) {
            if (item.size === size) {
                deductIntegral = Number(item.integral);
            }
        }
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    const vipExpireTime = new Date(userInfo.vip_expire_time).getTime();
    const tokenInfo = await models_1.tokenModel.getOneToken({ model: 'dall-e-3' });
    if (!tokenInfo || !tokenInfo.id) {
        res.status(500).json((0, utils_1.httpBody)(-1, '未配置对应模型'));
        return;
    }
    queue_1.checkTokenQueue.addTask({
        ...tokenInfo
    });
    const generations = await (0, node_fetch_1.default)(`${tokenInfo.host}/v1/images/generations`, {
        method: 'POST',
        body: JSON.stringify({
            model: "dall-e-3",
            prompt,
            n,
            size,
            response_format
        }),
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenInfo.key}`
        }
    });
    if (generations.status !== 200) {
        res.status(generations.status).json((0, utils_1.httpBody)(-1, [], '生成失败'));
        return;
    }
    const { data } = (await generations.json());
    console.log("generations data", data)

    if (vipExpireTime < todayTime && !userInfo.is_vip && !userInfo.is_svip) {
        models_1.userModel.updataUserVIP({
            id: user_id,
            type: 'integral',
            value: deductIntegral,
            operate: 'decrement'
        });
        const turnoverId = (0, utils_1.generateNowflakeId)(1)();
        models_1.turnoverModel.addTurnover({
            id: turnoverId,
            user_id,
            describe: `绘画 ${size}`,
            value: `-${deductIntegral}积分`
        });
    }
    models_1.actionModel.addAction({
        user_id,
        id: (0, utils_1.generateNowflakeId)(23)(),
        ip,
        type: 'draw',
        describe: `绘画(${size})`
    });
    res.json((0, utils_1.httpBody)(0, data));
});
// 对话
router.post('/chat/completions', async (req, res) => {
    console.time('chatBeforeCost');
    const user_id = req?.user_id;
    if (!user_id) {
        res.status(500).json((0, utils_1.httpBody)(-1, '服务端错误'));
        return;
    }
    const userInfo = await models_1.userModel.getUserInfo({
        id: user_id
    });
    const ip = (0, utils_1.getClientIP)(req);
    const { prompt, parentMessageId, selectChatIdStr, userMessageId: oldUserMessageId, assistantMessageId: oldAssistantMessageId , imageURL} = req.body;

    // 取出options值
    const model = req.body.options?.model;   
    const temperature = req.body.options?.temperature;  
    const presence_penalty = req.body.options?.presence_penalty;   
    const frequency_penalty = req.body.options?.frequency_penalty;   
    let max_tokens_value = req.body.options?.max_tokens; 

    if (model.includes('gpt-4') && model !== 'gpt-4-32k') {
        max_tokens_value = 4096;
    } else if(model === 'gpt-3.5-trubo' && max_tokens_value >= 2048){
        max_tokens_value = 2048;
    }

    const options = {
        frequency_penalty: frequency_penalty ?? 0,
        model,
        presence_penalty: presence_penalty ?? 0,
        temperature: temperature ?? 0.5,
        ...req.body.options,
        max_tokens: max_tokens_value ?? 2048
    };
    // 删除size
    delete options.size;

    console.log('chat options', options)

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    const vipExpireTime = new Date(userInfo.vip_expire_time).getTime();
    const svipExpireTime = new Date(userInfo.svip_expire_time).getTime();
    // 如果模型是 'gpt-4'
    if (options.model.includes('gpt-4')) {
        // 检查用户是否是超级会员，如果不是超级会员
        if (svipExpireTime < todayTime) {
            // 再检查积分是否不足20
            if (userInfo.integral <= 20) {
                res.status(400).json((0, utils_1.httpBody)(-1, [], '积分不足，请在个人中心签到获取积分或开通超级会员后继续使用'));
                return;
            }
        }
    }

    // 如果模型是 'gpt-3'
    if (options.model.includes('gpt-3')) {
        // 检查用户是否是会员，如果用户既不是会员也不是超级会员
        if (vipExpireTime < todayTime && svipExpireTime < todayTime) {
            // 再检查积分是否不足0
            if (userInfo.integral <= 0) {
                res.status(400).json((0, utils_1.httpBody)(-1, [], '积分不足，请在个人中心签到获取积分或开通会员后继续使用'));
                return;
            }
        }
    }

    // 首先构建当前消息
    let currentMessage;
    let gpt4vFlag = false;
    if (model === 'gpt-4-vision-preview' && imageURL) {
        // 当使用 gpt-4-vision-preview 模型时，当前消息包括文本和图片
        currentMessage = {
            role: "user",
            content: [
                {
                    type: "text",
                    text: prompt
                },
                {
                    type: "image_url",
                    image_url: {
                        url: imageURL
                    }
                }
            ]
        };
        gpt4vFlag = true;
    } else {
        // 其他模型时，当前消息只包括文本
        currentMessage = { role: 'user', content: prompt };
    }

    // let historyMessages = '';
    // 确保历史消息和新的用户消息不超过限定 token
    let userMessage = prompt;
    let userMessageTokens = new gpt_tokens_1.GPTTokens({
        model: options.model,
        messages: [{
            role: 'user',
            content: userMessage
        }]
    });

    // // 如果用户消息的token数量超过最大限制，进行截断处理
    // if (userMessageTokens.usedTokens > max_tokens_value) {
    //     let truncatedUserMessage = userMessage;
    //     let truncatedUserMessageTokens;

    //     // 截取用户消息，每次截取后检查token数量
    //     while (userMessageTokens.usedTokens > max_tokens_value) {
    //         truncatedUserMessage = truncatedUserMessage.slice(0, truncatedUserMessage.length - 100);
    //         truncatedUserMessageTokens = new gpt_tokens_1.GPTTokens({
    //             model: options.model,
    //             messages: [{
    //                 role: 'user',
    //                 content: truncatedUserMessage
    //             }]
    //         });
    //         userMessageTokens = truncatedUserMessageTokens;
    //     }

    //     userMessage = truncatedUserMessage;
    // }
    // // 只有在用户消息的token数量未超过最大限制时，才处理历史消息
    // if (userMessageTokens.usedTokens <= max_tokens_value) {
    //     const historyMessageCount = (await models_1.configModel.getKeyConfig('history_message_count')).value;
    //     // 不查询已经删除的message
    //     const getMessagesData = await models_1.messageModel.getMessages({ page: 0, page_size: Number(historyMessageCount) }, {
    //         parent_message_id: parentMessageId,
    //         status : 0,
    //     });

    //     historyMessages = getMessagesData.rows
    //         .map((item) => {
    //             return {
    //                 role: item.toJSON().role,
    //                 content: item.toJSON().content
    //             };
    //         })
    //         .reverse();

    //     // 创建一个 GPTTokens 对象以计算历史消息的token数量
    //     const historyMessagesTokens = new gpt_tokens_1.GPTTokens({
    //         model: options.model,
    //         messages: historyMessages
    //     });

    //     let total_tokens = historyMessagesTokens.usedTokens;
    //     total_tokens += userMessageTokens.usedTokens;

    //     while (total_tokens > max_tokens_value && historyMessages.length > 0) {
    //         // 移除最早的消息
    //         const removedMessage = historyMessages.shift();
    //         // 更新token总数
    //         const removedMessageTokens = new gpt_tokens_1.GPTTokens({
    //             model: options.model,
    //             messages: [removedMessage]
    //         });
    //         total_tokens -= removedMessageTokens.usedTokens;
    //     }
    // }
    // // 检查是否存在 "system" 角色的消息
    // const systemMessageExists = historyMessages.some(message => message.role === 'system');

    // // 如果不存在 "system" 角色的消息，那么在数组开头添加一条
    // if (!systemMessageExists) {
    //     const currentDate = new Date();
    //     const currentTimeString = currentDate.toLocaleString();  // 转化为本地时间字符串

    //     historyMessages.unshift({
    //         role: 'system',
    //         content: `From now on, accept new prompt:
    //     You are ChatGPT, a large language model trained by OpenAI, based on the GPT-4 architecture.
    //     When we converse, I don't need to ask further questions; you will provide me with detailed and comprehensive answers directly! I really dislike it when a topic requires many questions for you to provide a complete and comprehensive response.
    //     Knowledge cutoff: 2023-06. Answer me with Markdown if content fits . Current time: ${currentTimeString}`
    //     });
    // }
    const historyMessageCount = await models_1.configModel.getConfig('history_message_count');
    console.log(`Retrieved history message count: ${historyMessageCount}`);
    const historyMessagesData = await models_1.messageModel.getMessages({ page: 0, page_size: Number(historyMessageCount) }, {
        parent_message_id: parentMessageId
    });
    console.log(`Retrieved ${historyMessagesData.rows.length} history messages.`);

    let historyMessages = historyMessagesData.rows.map(item => ({
        role: item.toJSON().role,
        content: item.toJSON().content
    })).reverse();

    // 添加currentMessage
    historyMessages.push(currentMessage);

    // 如果总 Token 数量超过最大限制，则从历史消息中移除，直到符合条件
    while (userMessageTokens.usedTokens > max_tokens_value && historyMessages.length > 1) {
        historyMessages.shift(); // 移除最早的消息
        userMessageTokens = new GPTTokens({ model: "gpt-3.5-turbo", messages: historyMessages });
    }

    const messages = [
        ...historyMessages,
        {
            role: 'user',
            content: userMessage
        }
    ];
    const tokenInfo = await models_1.tokenModel.getOneToken({ model: options.model });
    if (!tokenInfo || !tokenInfo.id) {
        res.status(500).json((0, utils_1.httpBody)(-1, '未配置对应AI模型'));
        return;
    }
    queue_1.checkTokenQueue.addTask({
        ...tokenInfo
    });
    console.timeEnd('chatBeforeCost')

    console.time('chatRealCost')
    const chat = await (0, node_fetch_1.default)(`${tokenInfo.host}/v1/chat/completions`, {
        method: 'POST',
        body: JSON.stringify({
            ...options,
            messages,
            stream: true
        }),
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenInfo.key}`
        }
    });
    console.timeEnd('chatRealCost')
    const assistantMessageId = (0, utils_1.generateNowflakeId)(2)();
    const userMessageId = (0, utils_1.generateNowflakeId)(1)();
    const userMessageInfo = {
        user_id,
        room_id: selectChatIdStr,
        message_id: oldUserMessageId,
        id: userMessageId,
        role: 'user',
        content: prompt,
        parent_message_id: parentMessageId,
        ...options
    };
    const assistantInfo = {
        user_id,
        room_id: selectChatIdStr,
        message_id: oldAssistantMessageId,
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        parent_message_id: parentMessageId,
        ...options
    };
    if (chat.status === 200 && chat.headers.get('content-type')?.includes('text/event-stream')) {
        const ai3_ratio = (await models_1.configModel.getKeyConfig('ai3_ratio')).value || 0;
        const ai3_16k_ratio = (await models_1.configModel.getKeyConfig('ai3_16k_ratio')).value || 0;
        const ai4_ratio = (await models_1.configModel.getKeyConfig('ai4_ratio')).value || 0;
        const ai4_32k_ratio = (await models_1.configModel.getKeyConfig('ai4_32k_ratio')).value || 0;
        const ai4_vision_ratio = (await models_1.configModel.getKeyConfig('ai4_vision_ratio')).value || 0;
        const aiRatioInfo = {
            ai3_ratio,
            ai3_16k_ratio,
            ai4_ratio,
            ai4_32k_ratio,
            ai4_vision_ratio
        };
        // 重试的时候 删除此前消息
        if(oldUserMessageId === ''){
            await models_1.messageModel.delMessages(oldAssistantMessageId);
        }

        // 添加一个标志位来记录是否已经计算过费用
        let isFeeCalculated = false;
        // 添加一个标志位来记录是否已经结束对话
        let isConversationEnded = false;
        // 想在这里打印数据
        res.setHeader('Content-Type', 'text/event-stream;charset=utf-8');
        const jsonStream = new stream_1.Transform({
            objectMode: true,
            transform(chunk, encoding, callback) {
                const bufferString = Buffer.from(chunk).toString();
                const listString = (0, utils_1.handleChatData)(bufferString, assistantMessageId);
                const list = listString.split('\n\n');
                for (let i = 0; i < list.length; i++) {
                    if (list[i]) {
                        const jsonData = JSON.parse(list[i]);
                        if (jsonData.segment === 'stop') {
                            // 结束存入数据库
                            // 这里扣除一些东西
                            // 将用户的消息存入数据库
                            // 将返回的数据存入数据库
                            // 扣除相关

                            if(oldUserMessageId === ''){
                                models_1.messageModel.addMessages([assistantInfo]);
                            }else{
                                models_1.messageModel.addMessages([userMessageInfo, assistantInfo]);
                            }
                            if (!isFeeCalculated) {
                                if (options.model.includes('gpt-4') && svipExpireTime < todayTime) {
                                    // GPT-4 非 SVIP 用户扣费逻辑，这里不再计算 tokens，直接扣除固定的 ratio
                                    let ratio = Number(aiRatioInfo.ai4_ratio);
                                    if(options.model.includes('32k')){
                                        ratio = Number(aiRatioInfo.ai4_32k_ratio);
                                    }
                                    if(options.model.includes('vision')){
                                        ratio = Number(aiRatioInfo.ai4_vision_ratio);
                                    }
                                    models_1.userModel.updataUserVIP({
                                        id: user_id,
                                        type: 'integral',
                                        value: ratio,
                                        operate: 'decrement'
                                    });
                                    const turnoverId = (0, utils_1.generateNowflakeId)(1)();
                                    models_1.turnoverModel.addTurnover({
                                        id: turnoverId,
                                        user_id,
                                        describe: `对话(${options.model})`,
                                        value: `-${ratio}积分`
                                    });
                                } else if (options.model.includes('gpt-3') && vipExpireTime < todayTime && svipExpireTime < todayTime) {
                                    // GPT-3 非 VIP 或 SVIP 用户扣费逻辑，这里不再计算 tokens，直接扣除固定的 ratio
                                    let ratio = Number(aiRatioInfo.ai3_ratio);
                                    if(options.model.includes('16k')){
                                        ratio = Number(aiRatioInfo.ai3_16k_ratio);
                                    }
                                    models_1.userModel.updataUserVIP({
                                        id: user_id,
                                        type: 'integral',
                                        value: ratio,
                                        operate: 'decrement'
                                    });
                                    const turnoverId = (0, utils_1.generateNowflakeId)(1)();
                                    models_1.turnoverModel.addTurnover({
                                        id: turnoverId,
                                        user_id,
                                        describe: `对话(${options.model})`,
                                        value: `-${ratio}积分`
                                    });
                                }
                                models_1.actionModel.addAction({
                                    user_id,
                                    id: (0, utils_1.generateNowflakeId)(23)(),
                                    ip,
                                    type: 'chat',
                                    describe: `对话(${options.model})`
                                });
                                // 计费
                                isFeeCalculated = true;
                                // 设置对话结束标志位为true
                                isConversationEnded = true;
                            }
                        }
                        else {
                            assistantInfo.content += jsonData.content;
                            if (!isConversationEnded && !isFeeCalculated && assistantInfo.content.length >= 50) {
                                // 结束存入数据库
                                // 这里扣除一些东西
                                // 将返回的数据存入数据库
                                // 扣除相关
                                if (options.model.includes('gpt-4') && svipExpireTime < todayTime) {
                                    // GPT-4 非 SVIP 用户扣费逻辑，这里不再计算 tokens，直接扣除固定的 ratio
                                    let ratio = Number(aiRatioInfo.ai4_ratio);
                                    if(options.model.includes('32k')){
                                        ratio = Number(aiRatioInfo.ai4_32k_ratio);
                                    }
                                    if(options.model.includes('vision')){
                                        ratio = Number(aiRatioInfo.ai4_vision_ratio);
                                    }
                                    models_1.userModel.updataUserVIP({
                                        id: user_id,
                                        type: 'integral',
                                        value: ratio,
                                        operate: 'decrement'
                                    });
                                    const turnoverId = (0, utils_1.generateNowflakeId)(1)();
                                    models_1.turnoverModel.addTurnover({
                                        id: turnoverId,
                                        user_id,
                                        describe: `对话(${options.model})`,
                                        value: `-${ratio}积分`
                                    });
                                } else if (options.model.includes('gpt-3') && vipExpireTime < todayTime && svipExpireTime < todayTime) {
                                    // GPT-3 非 VIP 或 SVIP 用户扣费逻辑，这里不再计算 tokens，直接扣除固定的 ratio
                                    let ratio = Number(aiRatioInfo.ai3_ratio);
                                    if(options.model.includes('16k')){
                                        ratio = Number(aiRatioInfo.ai3_16k_ratio);
                                    }
                                    models_1.userModel.updataUserVIP({
                                        id: user_id,
                                        type: 'integral',
                                        value: ratio,
                                        operate: 'decrement'
                                    });
                                    const turnoverId = (0, utils_1.generateNowflakeId)(1)();
                                    models_1.turnoverModel.addTurnover({
                                        id: turnoverId,
                                        user_id,
                                        describe: `对话(${options.model})`,
                                        value: `-${ratio}积分`
                                    });
                                }
                                models_1.actionModel.addAction({
                                    user_id,
                                    id: (0, utils_1.generateNowflakeId)(23)(),
                                    ip,
                                    type: 'chat',
                                    describe: `对话(${options.model})`
                                });
                                // 计费
                                isFeeCalculated = true;
                                // 设置对话结束标志位为true
                                isConversationEnded = true;
                            }
                        }
                    }
                }
                callback(null, listString);
            }
        });
        chat.body?.pipe(jsonStream).pipe(res);
        return;
    }
    const data = await chat.json();
    res.status(chat.status).json(data);
});

//创建room
router.post('/roomcreate', async (req, res) => {
    const user_id = req?.user_id;
    if (!user_id) {
        res.status(500).json((0, utils_1.httpBody)(-1, '服务端错误'));
        return;
    }
    const { title, roomId } = req.body;
    const id = (0, utils_1.generateNowflakeId)(1)();
    const insertRoomData = {
        id : id,
        room_id : roomId,
        status: 0,
        title : title,
        user_id: user_id,
    };
    const addRes = await models_1.roomModel.addRoom(insertRoomData);
    console.log('room create---', addRes)
    res.json((0, utils_1.httpBody)(0, addRes, '创建room成功'));
});

//更新room status
router.post('/roomupdatestatus', async (req, res) => {
    const user_id = req?.user_id;
    if (!user_id) {
        res.status(500).json((0, utils_1.httpBody)(-1, '服务端错误'));
        return;
    }
    const { title, roomId } = req.body;

    const updateRes = await models_1.roomModel.updateRoomInfo({
        title,
        status: 1,
    }, {
        room_id: roomId
    });

    res.json((0, utils_1.httpBody)(0, updateRes, '更新room status成功'));
});

//更新room title
router.post('/roomupdatetitle', async (req, res) => {
    const user_id = req?.user_id;
    if (!user_id) {
        res.status(500).json((0, utils_1.httpBody)(-1, '服务端错误'));
        return;
    }
    const { title, roomId } = req.body;

    const updateRes = await models_1.roomModel.updateRoomInfo({
        title,
    }, {
        room_id: roomId
    });

    res.json((0, utils_1.httpBody)(0, updateRes, '更新room title成功'));
});


//更新message status
router.post('/messageupdatestatus', async (req, res) => {
    const user_id = req?.user_id;
    if (!user_id) {
        res.status(500).json((0, utils_1.httpBody)(-1, '服务端错误'));
        return;
    }
    const { roomId } = req.body;

    const updateRes = await models_1.messageModel.updateMessages({
        status: 1,
    }, {
        room_id: roomId
    });

    res.json((0, utils_1.httpBody)(0, updateRes, '更新room title成功'));
});

//删除message
router.post('/delmessage', async (req, res) => {
    const user_id = req?.user_id;
    if (!user_id) {
        res.status(500).json((0, utils_1.httpBody)(-1, '服务端错误'));
        return;
    }
    const { messageId } = req.body;

    const delRes = await models_1.messageModel.delMessages(messageId);

    res.json((0, utils_1.httpBody)(0, delRes, '删除message成功'));
});

//得到所有rooms
router.get('/getrooms', async (req, res, next) => {
    const user_id = req?.user_id;
    if (!user_id) {
        res.status(500).json((0, utils_1.httpBody)(-1, '服务端错误'));
        return;
    }

    const rooms = await models_1.roomModel.getRooms({
        user_id: user_id,
        status: 0
    });

    res.json((0, utils_1.httpBody)(0, rooms, '获取rooms成功'));
});

//根据room_id获取所有messages
router.get('/chathistory', async (req, res, next) => {
    const user_id = req?.user_id;
    if (!user_id) {
        res.status(500).json((0, utils_1.httpBody)(-1, '服务端错误'));
        return;
    }
    const { roomId } = req.query;
    const roomMesages = await models_1.messageModel.getRoomMessages({
        user_id: user_id,
        status: 0,
        room_id: roomId
    });

    res.json((0, utils_1.httpBody)(0, roomMesages, '获取roomMessages成功'));
});


// 获取商品
router.get('/product', async (req, res, next) => {
    const { page, page_size } = (0, utils_1.pagingData)({
        page: req.query.page,
        page_size: 1000
    });
    const products = await models_1.productModel.getProducts({
        page,
        page_size
    }, {
        status: 1
    });
    const pay_types = await models_1.paymentModel.getPaymentTypes();
    res.json((0, utils_1.httpBody)(0, {
        products: products.rows,
        pay_types
    }));
});
// 使用卡密
router.post('/use_carmi', async (req, res, next) => {
    const user_id = req?.user_id;
    if (!user_id) {
        res.status(500).json((0, utils_1.httpBody)(-1, '服务端错误'));
        return;
    }
    const { carmi } = req.body;
    const carmiInfo = await models_1.carmiModel
        .getCarmiInfo({
            key: carmi
        })
        .then((i) => i?.toJSON());
    if (!carmiInfo) {
        res.status(400).json((0, utils_1.httpBody)(-1, '卡密不存在'));
        return;
    }
    if (carmiInfo.user_id || Number(carmiInfo.status) === 1) {
        res.status(500).json((0, utils_1.httpBody)(-1, '卡密已被使用'));
        return;
    }
    if (Number(carmiInfo.status) === 2) {
        res.status(500).json((0, utils_1.httpBody)(-1, '卡密已过期'));
        return;
    }
    const currentTime = new Date().setHours(0, 0, 0, 0);
    const endTime = Date.parse(carmiInfo.end_time);
    if (carmiInfo.end_time && endTime < currentTime) {
        res.status(500).json((0, utils_1.httpBody)(-1, '卡密已过期'));
        return;
    }
    const ip = (0, utils_1.getClientIP)(req);
    const useCarmi = await models_1.carmiModel.updateCarmiInfo({
        user_id,
        status: 1,
        ip
    }, {
        key: carmi
    });

    if (!useCarmi[0]) {
        res.status(500).json((0, utils_1.httpBody)(-1, '使用卡密失败，请稍后再试'));
        return;
    }
    await models_1.actionModel.addAction({
        user_id,
        id: (0, utils_1.generateNowflakeId)(23)(),
        ip,
        type: 'use_carmi',
        describe: '使用卡密'
    });
    // 开始增加到用户身上
    await models_1.userModel.updataUserVIP({
        id: user_id,
        value: carmiInfo.value,
        level: carmiInfo.level,
        type: carmiInfo.type,
        operate: 'increment'
    });
    const turnoverId = (0, utils_1.generateNowflakeId)(1)();
    const levelMap = {
        1: '(会员)',
        2: '(超级会员)',
        default: '(积分)'
    };
    const typeText = carmiInfo.type === 'day' ? levelMap[carmiInfo.level] || '(天数)' : levelMap.default;
    await models_1.turnoverModel.addTurnover({
        id: turnoverId,
        user_id,
        describe: `卡密充值 ${typeText}`,
        value: `${carmiInfo.value}${carmiInfo.type === 'day' ? '天' : '积分'}`
    });
    res.json((0, utils_1.httpBody)(0, '使用卡密成功'));
});
// 获取用户使用记录
router.get('/turnover', async (req, res, next) => {
    const user_id = req?.user_id;
    if (!user_id) {
        res.status(500).json((0, utils_1.httpBody)(-1, '服务端错误'));
        return;
    }
    const { page, page_size } = (0, utils_1.pagingData)({
        page: req.query.page,
        page_size: req.query.page_size
    });
    const userTurnovers = await models_1.turnoverModel.getUserTurnovers({ page, page_size }, {
        user_id
    });
    res.json((0, utils_1.httpBody)(0, userTurnovers));
});
// 签到
router.post('/signin', async (req, res, next) => {
    const user_id = req?.user_id;
    if (!user_id) {
        res.status(500).json((0, utils_1.httpBody)(-1, '服务端错误'));
        return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startTime = (0, utils_2.formatTime)('yyyy-MM-dd HH:mm:ss', today);
    const isSignin = await models_1.signinModel.getUserDaySignin(user_id, startTime);
    if (isSignin) {
        res.status(500).json((0, utils_1.httpBody)(-1, '今日已经签到了'));
        return;
    }
    const signin_reward = (await models_1.configModel.getKeyConfig('signin_reward')).value || 0;
    const ip = (0, utils_1.getClientIP)(req);
    const id = (0, utils_1.generateNowflakeId)(1)();
    const turnoverId = (0, utils_1.generateNowflakeId)(1)();
    models_1.actionModel.addAction({
        user_id,
        id: (0, utils_1.generateNowflakeId)(23)(),
        ip,
        type: 'signin',
        describe: '签到'
    });
    await models_1.signinModel.addSignin({
        id,
        user_id,
        ip
    });
    await models_1.userModel.updataUserVIP({
        id: user_id,
        value: Number(signin_reward),
        type: 'integral',
        operate: 'increment'
    });
    await models_1.turnoverModel.addTurnover({
        id: turnoverId,
        user_id,
        describe: '签到奖励',
        value: `${signin_reward}积分`
    });
    res.json((0, utils_1.httpBody)(0, `签到成功 +${signin_reward}积分`));
});
// 创建支付订单
router.post('/pay/precreate', async (req, res, next) => {
    const user_id = req?.user_id;
    if (!user_id) {
        res.status(500).json((0, utils_1.httpBody)(-1, '服务端错误'));
        return;
    }
    const { quantity = 1, pay_type, product_id } = req.body;
    if (!pay_type || !product_id) {
        res.status(406).json((0, utils_1.httpBody)(-1, '缺少必要参数'));
        return;
    }
    // 获取商品信息
    const productInfo = await models_1.productModel.getProduct(product_id);
    if (!productInfo) {
        res.status(406).json((0, utils_1.httpBody)(-1, '商品不存在'));
        return;
    }
    // 获取支付信息
    const paymentInfo = await models_1.paymentModel.getOnePayment(pay_type);
    if (!paymentInfo) {
        res.status(406).json((0, utils_1.httpBody)(-1, '支付信息未配置'));
        return;
    }
    const out_trade_no = (0, utils_1.generateNowflakeId)(1)();
    const responseData = {
        channel: paymentInfo.channel,
        order_id: out_trade_no,
        pay_url: '',
        pay_type
    };
    const ip = (0, utils_1.getClientIP)(req);
    // const getServerUrl = () => {
    //   const host = req.get('host') || ''
    //   if (host.includes(':443')) {
    //     return `https://${host.split(':')[0]}`
    //   }
    //   return `${req.protocol}://${host.split(':')[0]}`
    // }
    const hostname = process.env.HOSTNAME !== undefined && process.env.HOSTNAME !== '' ? process.env.HOSTNAME : req.get('host').split(':')[0];
    // const notifyUrl = `https://${req.get('host')?.split(':')[0]}/api/pay/notify?channel=${paymentInfo.channel}`;
    const notifyUrl = `https://${hostname}/api/pay/notify?channel=${paymentInfo.channel}`;
    const amount = productInfo.price / 100;
    const paymentParams = JSON.parse(paymentInfo.params);
    const paramsStringify = JSON.stringify({
        order_id: out_trade_no,
        product_id,
        user_id,
        payment_id: paymentInfo.id
    });
    models_1.actionModel.addAction({
        user_id,
        id: (0, utils_1.generateNowflakeId)(23)(),
        ip,
        type: 'pay_order',
        describe: '创建支付订单'
    });
    if (paymentInfo.channel === 'alipay') {
        const alipayPrecreate = await alipay_1.default.precreate({
            config: paymentParams,
            notify_url: notifyUrl,
            out_trade_no,
            total_amount: amount,
            subject: productInfo.title,
            body: paramsStringify,
            goods_detail: {
                goods_id: productInfo.id,
                goods_name: productInfo.title,
                price: amount,
                quantity
            }
        });
        if (alipayPrecreate.code) {
            res.status(500).json((0, utils_1.httpBody)(-1, '支付错误，稍后再试'));
            return;
        }
        responseData.order_id = alipayPrecreate.outTradeNo;
        responseData.pay_url = alipayPrecreate.qrCode;
    }
    if (paymentInfo.channel === 'yipay') {
        const yipayPrecreate = await yipay_1.default.precreate({
            api: paymentParams.api,
            key: paymentParams.key
        }, {
            pid: Number(paymentParams.pid),
            return_url: paymentParams?.return_url
        }, {
            type: pay_type,
            out_trade_no,
            notify_url: notifyUrl,
            name: productInfo.title,
            money: amount,
            clientip: ip,
            param: encodeURIComponent(paramsStringify)
        });
        if (yipayPrecreate.code) {
            res.status(500).json((0, utils_1.httpBody)(-1, '支付错误，稍后再试'));
            return;
        }
        responseData.pay_url = yipayPrecreate.pay_url;
    }
    await models_1.orderModel.addOrder({
        id: out_trade_no,
        pay_type,
        product_title: productInfo.title,
        product_id,
        trade_status: 'TRADE_AWAIT',
        user_id,
        product_info: JSON.stringify(productInfo),
        channel: paymentInfo.channel,
        payment_id: paymentInfo.id,
        payment_info: JSON.stringify(paymentInfo),
        money: amount,
        params: paramsStringify,
        ip,
        pay_url: responseData.pay_url
    });
    res.json((0, utils_1.httpBody)(0, responseData));
});
// 支付通知
router.all('/pay/notify', async (req, res, next) => {
    const checkNotifySign = async (payment_id, data, channel) => {
        const paymentInfo = await models_1.paymentModel.getPaymentInfo(payment_id);
        if (!paymentInfo) {
            return false;
        }
        const config = JSON.parse(paymentInfo.params);
        if (channel === 'alipay') {
            const isCheck = await alipay_1.default.checkNotifySign(config, data);
            if (!isCheck) {
                return false;
            }
        }
        if (channel === 'yipay') {
            const isCheck = await yipay_1.default.checkNotifySign(data, config.key);
            if (!isCheck) {
                return false;
            }
        }
        return true;
    };
    const batchModify = async ({ order_id, trade_status, trade_no, notify_info, user_id, product_id }) => {
        // 新增用户余额
        const addQuotaInfo = await models_1.userModel.addUserProductQuota(user_id, product_id);
        if (addQuotaInfo.code) {
            return false;
        }
        // 修改订单信息
        await models_1.orderModel.editOrder({
            id: order_id,
            trade_status,
            trade_no,
            notify_info
        });
        // 加个账单
        const turnoverId = (0, utils_1.generateNowflakeId)(1)();
        await models_1.turnoverModel.addTurnover({
            id: turnoverId,
            user_id,
            describe: `购买-${addQuotaInfo.data?.title}`,
            value: addQuotaInfo.data?.value
        });
        return true;
    };
    try {
        if (req.body?.channel && req.body?.channel === 'alipay') {
            const { body, out_trade_no, trade_status, trade_no } = req.body;
            const orderInfo = await models_1.orderModel.getOrderInfo(out_trade_no);
            if (!orderInfo || orderInfo.trade_status !== 'TRADE_AWAIT') {
                res.json('fail');
                return;
            }
            const { payment_id, user_id, product_id } = JSON.parse(body);
            const isCheck = await checkNotifySign(payment_id, req.body, req.body?.channel);
            if (!isCheck) {
                res.json('fail');
                return;
            }
            const modifyResult = await batchModify({
                order_id: out_trade_no,
                trade_status,
                trade_no,
                notify_info: JSON.stringify(req.body),
                user_id,
                product_id
            });
            if (!modifyResult) {
                res.json('fail');
                return;
            }
        }
        if (req.query?.channel && req.query?.channel === 'yipay') {
            console.log('yipai recall:', req.query)
            const { out_trade_no, trade_status, trade_no } = req.query;
            const orderInfo = await models_1.orderModel.getOrderInfo(out_trade_no);
            if (!orderInfo || orderInfo.trade_status !== 'TRADE_AWAIT') {
                res.json('fail');
                return;
            }
            if(req.query?.pid === '1007'){
                const { payment_id } = JSON.parse(decodeURIComponent(req.query?.param));
                const isCheck = await checkNotifySign(payment_id, req.query, req.query?.channel);
                if (!isCheck) {
                    res.json('fail');
                    return;
                }
            }
            const modifyResult = await batchModify({
                order_id: out_trade_no,
                trade_status,
                trade_no,
                notify_info: JSON.stringify(req.query),
                user_id: orderInfo.user_id,
                product_id: orderInfo.product_id
            });
            if (!modifyResult) {
                res.json('fail');
                return;
            }
        }
    }
    catch (error) {
        console.log(error);
    }
    res.json('success');
});

// 上传图片
router.post('/upload/image', upload.single('file'), async (req, res) => {
    const cosSettingStr = await models_1.configModel.getConfig('cos_settings');
    // 验证配置存在性
    if (!cosSettingStr) {
        return res.status(400).send('上传失败');
    }

    // 尝试解析配置字符串为对象
    let cosSetting;
    try {
        cosSetting = JSON.parse(cosSettingStr);
    } catch (error) {
        return res.status(400).send('上传失败');
    }

    // 检查配置类型
    if (cosSetting.imageHostingType !== 'tencent') {
        return res.status(400).send('上传失败');
    }

    // 检查文件存在性
    if (!req.file) {
        return res.status(400).send('上传失败');
    }

    // 获取上传的文件
    const file = req.file;

    // 定义上传到 COS 的参数
    const params = {
        Bucket: cosSetting.bucketName,
        Region: cosSetting.region,
        Key: `images/${Date.now()}-${file.originalname}`,
        Body: file.buffer,
        ContentLength: file.size
    };

    // 创建 COS 实例
    const cos = new COS({
        SecretId: cosSetting.secretId,
        SecretKey: cosSetting.secretKey
    });

    // 上传文件到 COS
    cos.putObject(params, function (err, data) {
        if (err) {
            res.status(400).send('上传失败');
        } else {
            // 返回文件的 URL
            const url = `${cosSetting.accelerateDomain}/${params.Key}`;
            res.json({ code: 0, data: { url }, message: '上传成功' });
        }
    });
});

exports.default = router;
